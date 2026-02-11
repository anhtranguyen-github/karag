# TasksApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**cancelTaskTasksTaskIdCancelPost**](TasksApi.md#canceltasktaskstaskidcancelpost) | **POST** /tasks/{task_id}/cancel | Cancel Task |
| [**cleanupTasksTasksCleanupDelete**](TasksApi.md#cleanuptaskstaskscleanupdelete) | **DELETE** /tasks/cleanup | Cleanup Tasks |
| [**getTaskStatusTasksTaskIdGet**](TasksApi.md#gettaskstatustaskstaskidget) | **GET** /tasks/{task_id} | Get Task Status |
| [**listTasksTasksGet**](TasksApi.md#listtaskstasksget) | **GET** /tasks/ | List Tasks |
| [**retryTaskTasksTaskIdRetryPost**](TasksApi.md#retrytasktaskstaskidretrypost) | **POST** /tasks/{task_id}/retry | Retry Task |



## cancelTaskTasksTaskIdCancelPost

> any cancelTaskTasksTaskIdCancelPost(taskId)

Cancel Task

Cancel a pending or processing task.

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { CancelTaskTasksTaskIdCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TasksApi();

  const body = {
    // string
    taskId: taskId_example,
  } satisfies CancelTaskTasksTaskIdCancelPostRequest;

  try {
    const data = await api.cancelTaskTasksTaskIdCancelPost(body);
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


## cleanupTasksTasksCleanupDelete

> any cleanupTasksTasksCleanupDelete(olderThanHours)

Cleanup Tasks

Remove completed/failed tasks older than the given number of hours.

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { CleanupTasksTasksCleanupDeleteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TasksApi();

  const body = {
    // number (optional)
    olderThanHours: 56,
  } satisfies CleanupTasksTasksCleanupDeleteRequest;

  try {
    const data = await api.cleanupTasksTasksCleanupDelete(body);
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
| **olderThanHours** | `number` |  | [Optional] [Defaults to `24`] |

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


## getTaskStatusTasksTaskIdGet

> any getTaskStatusTasksTaskIdGet(taskId)

Get Task Status

Get the current status of a specific task.

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

> any listTasksTasksGet(type, workspaceId)

List Tasks

List tasks, optionally filtered by type and workspace.

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
    // string (optional)
    workspaceId: workspaceId_example,
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
| **workspaceId** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## retryTaskTasksTaskIdRetryPost

> any retryTaskTasksTaskIdRetryPost(taskId)

Retry Task

Mark a failed task as retryable and re-dispatch it to background workers.

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { RetryTaskTasksTaskIdRetryPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TasksApi();

  const body = {
    // string
    taskId: taskId_example,
  } satisfies RetryTaskTasksTaskIdRetryPostRequest;

  try {
    const data = await api.retryTaskTasksTaskIdRetryPost(body);
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

