import json
from json import JSONDecodeError

from ndjson import reader


class CustomNDJSONReader(reader):
    def __next__(self):
        line = ""

        while line == "":
            line = next(self.f).strip()
        try:
            return json.loads(line, **self.kwargs)
        except JSONDecodeError:
            return ""
