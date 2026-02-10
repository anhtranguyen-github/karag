# TasksApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getTaskStatusTasksTaskIdGet**](TasksApi.md#gettaskstatustaskstaskidget) | **GET** /tasks/{task_id} | Get Task Status |
| [**listTasksTasksGet**](TasksApi.md#listtaskstasksget) | **GET** /tasks/ | List Tasks |



## getTaskStatusTasksTaskIdGet

> any getTaskStatusTasksTaskIdGet(taskId)

Get Task Status

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { GetTaskStatusTasksTaskIdGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TasksApi();

  const body = {
    // string
    taskId: taskId_example,
  } satisfies GetTaskStatusTasksTaskIdGetRequest;

  try {
    const data = await api.getTaskStatusTasksTaskIdGet(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **taskId** | `string` |  | [Defaults to `undefined`] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listTasksTasksGet

> any listTasksTasksGet(type)

List Tasks

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { ListTasksTasksGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TasksApi();

  const body = {
    // string (optional)
    type: type_example,
  } satisfies ListTasksTasksGetRequest;

  try {
    const data = await api.listTasksTasksGet(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **type** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

