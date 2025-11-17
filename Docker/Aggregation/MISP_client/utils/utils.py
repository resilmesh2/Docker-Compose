from typing import Generator


def extract_values_from_sequence(
    msg,
) -> (Generator[str or bool or int or float, None, None]):
    """
    Given a sequence, tries to extract the values

    :param msg: sequence dict or list
    :return: generator
    """
    if type(msg) is list:
        for i in msg:
            if type(i) in [str, bool, int, float]:
                yield i
            else:
                yield from extract_values_from_sequence(i)
    if type(msg) is dict:
        for k, v in msg.items():
            if type(v) in [str, bool, int, float]:
                yield k, v
            else:
                yield from extract_values_from_sequence(v)
