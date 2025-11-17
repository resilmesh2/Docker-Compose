from typing import Generator


def replace_values_in_sequence(
    sequence, search: any = "UNKNOWN", replace: any = None
) -> Generator[str or bool or int or float, None, None]:
    """
    Given a sequence, recursively replaces search value for the replace value

    :param sequence: dict, list, set (iterator types)
    :param search: any value
    :param replace: the replaced value
    :return: generator (nested dicts will be flatten)
    """
    result = sequence
    if type(result) is list:
        for i in result:
            if type(i) in [str, bool, int, float]:
                if i == search:
                    yield replace
                else:
                    yield i
            else:
                yield from replace_values_in_sequence(i)
    if type(result) is dict:
        for k, v in result.items():
            if type(v) in [str, bool, int, float]:
                if v == search:
                    yield k, replace
                else:
                    yield k, v
            else:
                yield from replace_values_in_sequence(v)


def dict_replace(
    _dict: dict or list, search: any = "UNKNOWN", replace: any = None
) -> dict or list:
    if type(_dict) is dict:
        for k, v in _dict.items():
            if v == search:
                _dict[k] = replace
            elif type(v) is list:
                for i, item in enumerate(v):
                    if type(item) is dict:
                        _dict[k][i] = dict_replace(item)
            if type(v) is dict:
                _dict[k] = dict_replace(v)
    if type(_dict) is list:
        for _i, _d in enumerate(_dict):
            _dict[_i] = dict_replace(_d)
    return _dict


def skip_current_file(file, lock):
    if file.name.startswith(".") or not file.is_file() or file.name.endswith(".lock"):
        return True
    if lock.is_locked:
        return True
    return False
