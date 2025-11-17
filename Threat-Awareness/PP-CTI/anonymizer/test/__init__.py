# ruff: noqa: T201
def log_results(results: dict | None):
    if results is None:
        print('JSON body was not found')
        return
    success = results['success']
    print(f'Pipeline\tsuccess: {success}')
    stages = results['result']
    for stage in stages:
        success = stages[stage]['success']
        print(f'Stage\t{stage}\tsuccess: {success}')
        jobs = stages[stage]['result']
        for job in jobs:
            success = jobs[job]['success']
            print(f'Job\t{job}\tsuccess: {success}')
            result = jobs[job]['result']
            print(f'Stage {stage} Job {job}: {result}')
