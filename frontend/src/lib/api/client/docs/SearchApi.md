# SearchApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**globalSearchSearchGet**](SearchApi.md#globalsearchsearchget) | **GET** /search/ | Global Search |



## globalSearchSearchGet

> any globalSearchSearchGet(q, workspaceId)

Global Search

Perform a unified search across all architectural entities.

### Example

```ts
import {
  Configuration,
  SearchApi,
} from '';
import type { GlobalSearchSearchGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SearchApi();

  const body = {
    // string | Search query
    q: q_example,
    // string | Optional workspace scope (optional)
    workspaceId: workspaceId_example,
  } satisfies GlobalSearchSearchGetRequest;

  try {
    const data = await api.globalSearchSearchGet(body);
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
| **q** | `string` | Search query | [Defaults to `undefined`] |
| **workspaceId** | `string` | Optional workspace scope | [Optional] [Defaults to `undefined`] |

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

