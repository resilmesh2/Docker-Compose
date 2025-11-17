from sanic_testing.reusable import ReusableClient


def test_debug_endpoint(f_sanic: ReusableClient):
    _, response = f_sanic.get('/api/debug/hello-world',
                              debug=True)
    assert response is not None
    assert response.status_code == 200
    assert response.content == b'Hello World!'
