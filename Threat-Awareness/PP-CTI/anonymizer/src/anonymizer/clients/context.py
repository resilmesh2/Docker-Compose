# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from abc import ABC, abstractmethod
from json import dumps, loads
from traceback import format_exc
from typing import override

from motor.motor_asyncio import AsyncIOMotorClient
from mysql.connector import Error, connect

from anonymizer.config import config, log
from anonymizer.models.data_model import Request


class ContextClient(ABC):
    @abstractmethod
    async def lookup(self,
                     data_types: list[str],
                     data_types_all: bool = True,
                     request_types: list[str] | None = None,
                     request_types_all: bool = True,
                     ) -> list[Request]:
        """Retrieve a series of Requests from the context database.

        Retrieving is based on whether the context database contains
        Objects or Attributes of the specified types.  It can
        optionally include only Requests that are of the specified
        Request types.

        :param data_types: A list of types to check Objects/Attributes
        against.

        :param data_types_all: If True, components must contain all
        types.  If False, components must contain at least
        one.  Defaults to True.

        :param request_types: A list of types to check Requests
        against.  Defaults to an empty list.

        :param request_types_all: If True, Requests must contain all
        types.  If False, Requests must contain at least one.
        Defaults to True.
        """
        ...

    @abstractmethod
    async def record(self, request: Request) -> bool:
        """Store a Request in the context database.

        :param request: The Request to store.
        """
        ...

    # In the future, an update() method might be required to make sure
    # types are propagated in case a new type is added.  This is
    # because the Request hash is calculated including types Check
    # comments on merge !7 for further info


class NoContextClient(ContextClient):
    @override
    async def lookup(self, *_) -> list[Request]:
        return []

    @override
    async def record(self, *_) -> bool:
        return False


class MongoDBContextClient(ContextClient):
    def __init__(self, url: str | None = None):
        self.url = (url
                    if url is not None
                    else config.context.mongodb.dsn.unicode_string())
        database = config.context.mongodb.database
        collection = config.context.mongodb.collection

        # Since the Motor client connects on demand, we can initialize
        # it here without worrying about closing it.
        client = AsyncIOMotorClient(self.url)
        self.collection = client[database][collection]

    @override
    async def lookup(self,
                     data_types: list[str],
                     data_types_all: bool = True,
                     request_types: list[str] | None = None,
                     request_types_all: bool = True,
                     ) -> list[Request]:
        projection = {
            # Remove the MongoDB id field
            '_id': 0,
        }

        # Look for a series of types within the Request components
        query: dict = {
            '$and': [
                {
                    'data.type': {
                        '$all'
                        if data_types_all
                        else '$in': data_types,
                    },
                },
            ],
        }

        if request_types is not None:
            request_filter: dict = {
                'type': {
                    '$all'
                    if request_types_all
                    else '$in': request_types,
                },
            }
            # Look for a series of types in the Request as well
            query['$and'].append(request_filter)

        ret = []
        async for e in self.collection.find(query, projection):
            req = Request.from_dict(e)
            ret.append(req)
        return ret

    @override
    async def record(self, request: Request) -> bool:
        filterr = {
            '_id': request.to_hash(),
        }
        insert = {
            '$set': Request.to_dict(request),
        }
        insert['$set'].update(filterr)
        await self.collection.update_one(filterr, insert, upsert=True)
        return True


class MySQLContextClient(ContextClient):
    def __init__(self,
                 host: str | None = None,
                 port: str | None = None,
                 ):
        self.host = (host
                     if host is not None
                     else config.context.mysql.dsn.host)
        self.port = (port
                     if port is not None
                     else config.context.mysql.dsn.port)
        self.username = config.context.mysql.dsn.username
        self.password = config.context.mysql.dsn.password
        self.database = config.context.mysql.database
        self.table = config.context.mysql.table

    def get_object_types(self, request: Request) -> str:
        return str(request.types_all())

    def get_request_types(self, request: Request) -> str:
        return str(set(request.type))

    @override
    async def lookup(self,
                     data_types: list[str],
                     data_types_all: bool = True,
                     request_types: list[str] | None = None,
                     request_types_all: bool = True,
                     ) -> list[Request]:
        connection = None
        cursor = None
        try:
            connection = connect(user=self.username,
                                 password=self.password,
                                 host=self.host,
                                 port=self.port,
                                 database=self.database)
            cursor = connection.cursor()
            query_filters = []

            # Component type filtering
            joiner = 'AND' if data_types_all else 'OR'
            joinees = [f"LOCATE('{field}', ComponentTypes) > 0"
                       for field in data_types]
            tmp = f'\n{joiner} '.join(joinees)
            if tmp != '':
                query_filters.append(tmp)

            # Request type filtering
            if request_types is not None:
                joiner = 'AND' if request_types_all else 'OR'
                joinees = [f"LOCATE('{field}', RequestTypes) > 0"
                           for field in request_types]
                tmp = f'\n{joiner} '.join(joinees)
                if tmp != '':
                    query_filters.append(tmp)

            conditions = ')\nOR ('.join(query_filters)
            query = ('SELECT Json as json\n'
                     f'FROM {self.table}\n'
                     # Following line is ignored if there's no
                     # conditions
                     f'WHERE ({conditions})\n' if conditions != '' else '')
            cursor.execute(query)
            response = []
            for j in cursor:
                response.append(Request.from_dict(loads(j[0])))
            cursor.close()
            connection.close()
            return response
        except Error:
            log.error('Error while retrieving context from MySQL database')
            log.debug(format_exc())
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
            return []

    @override
    async def record(self, request: Request) -> bool:
        connection = None
        cursor = None
        try:
            connection = connect(user=self.username,
                                 password=self.password,
                                 host=self.host,
                                 port=self.port,
                                 database=self.database)
            cursor = connection.cursor()
            query = (
                f'INSERT IGNORE INTO {self.table}\n'
                '(Hash, Json, ComponentTypes, RequestTypes)\n'
                'VALUES (%s, %s, %s, %s);\n'
            )
            request_json = dumps(Request.to_dict(request))

            data = [
                request.to_hash(),
                request_json,
                self.get_object_types(request),
                self.get_request_types(request),
            ]
            cursor.execute(query, data)
            connection.commit()
            cursor.close()
            connection.close()
            return True
        except Error:
            log.error('Error while storing context in MySQL database')
            log.debug(format_exc())
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
            return False
