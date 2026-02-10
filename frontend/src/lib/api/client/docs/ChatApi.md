# ChatApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**chatStreamChatStreamPost**](ChatApi.md#chatstreamchatstreampost) | **POST** /chat/stream | Chat Stream |
| [**deleteThreadChatThreadsThreadIdDelete**](ChatApi.md#deletethreadchatthreadsthreadiddelete) | **DELETE** /chat/threads/{thread_id} | Delete Thread |
| [**getChatHistoryChatHistoryThreadIdGet**](ChatApi.md#getchathistorychathistorythreadidget) | **GET** /chat/history/{thread_id} | Get Chat History |
| [**listChatThreadsChatThreadsGet**](ChatApi.md#listchatthreadschatthreadsget) | **GET** /chat/threads | List Chat Threads |
| [**updateThreadTitleChatThreadsThreadIdTitlePatch**](ChatApi.md#updatethreadtitlechatthreadsthreadidtitlepatch) | **PATCH** /chat/threads/{thread_id}/title | Update Thread Title |



## chatStreamChatStreamPost

> any chatStreamChatStreamPost()

Chat Stream

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { ChatStreamChatStreamPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  try {
    const data = await api.chatStreamChatStreamPost();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

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

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteThreadChatThreadsThreadIdDelete

> any deleteThreadChatThreadsThreadIdDelete(threadId)

Delete Thread

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { DeleteThreadChatThreadsThreadIdDeleteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // string
    threadId: threadId_example,
  } satisfies DeleteThreadChatThreadsThreadIdDeleteRequest;

  try {
    const data = await api.deleteThreadChatThreadsThreadIdDelete(body);
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
| **threadId** | `string` |  | [Defaults to `undefined`] |

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


## getChatHistoryChatHistoryThreadIdGet

> any getChatHistoryChatHistoryThreadIdGet(threadId)

Get Chat History

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { GetChatHistoryChatHistoryThreadIdGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // string
    threadId: threadId_example,
  } satisfies GetChatHistoryChatHistoryThreadIdGetRequest;

  try {
    const data = await api.getChatHistoryChatHistoryThreadIdGet(body);
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
| **threadId** | `string` |  | [Defaults to `undefined`] |

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


## listChatThreadsChatThreadsGet

> any listChatThreadsChatThreadsGet(workspaceId)

List Chat Threads

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { ListChatThreadsChatThreadsGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // string (optional)
    workspaceId: workspaceId_example,
  } satisfies ListChatThreadsChatThreadsGetRequest;

  try {
    const data = await api.listChatThreadsChatThreadsGet(body);
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
| **workspaceId** | `string` |  | [Optional] [Defaults to `&#39;default&#39;`] |

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


## updateThreadTitleChatThreadsThreadIdTitlePatch

> any updateThreadTitleChatThreadsThreadIdTitlePatch(threadId)

Update Thread Title

### Example

```ts
import {
  Configuration,
  ChatApi,
} from '';
import type { UpdateThreadTitleChatThreadsThreadIdTitlePatchRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ChatApi();

  const body = {
    // string
    threadId: threadId_example,
  } satisfies UpdateThreadTitleChatThreadsThreadIdTitlePatchRequest;

  try {
    const data = await api.updateThreadTitleChatThreadsThreadIdTitlePatch(body);
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
| **threadId** | `string` |  | [Defaults to `undefined`] |

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

