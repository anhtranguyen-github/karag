# ToolsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addToolToolsPost**](ToolsApi.md#addtooltoolspost) | **POST** /tools/ | Add Tool |
| [**deleteToolToolsToolIdDelete**](ToolsApi.md#deletetooltoolstooliddelete) | **DELETE** /tools/{tool_id} | Delete Tool |
| [**listToolsToolsGet**](ToolsApi.md#listtoolstoolsget) | **GET** /tools/ | List Tools |
| [**toggleToolToolsToolIdTogglePost**](ToolsApi.md#toggletooltoolstoolidtogglepost) | **POST** /tools/{tool_id}/toggle | Toggle Tool |



## addToolToolsPost

> any addToolToolsPost(toolDefinition)

Add Tool

Register a new tool (Custom/MCP).

### Example

```ts
import {
  Configuration,
  ToolsApi,
} from '';
import type { AddToolToolsPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ToolsApi();

  const body = {
    // ToolDefinition
    toolDefinition: ...,
  } satisfies AddToolToolsPostRequest;

  try {
    const data = await api.addToolToolsPost(body);
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
| **toolDefinition** | [ToolDefinition](ToolDefinition.md) |  | |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteToolToolsToolIdDelete

> any deleteToolToolsToolIdDelete(toolId)

Delete Tool

Delete a custom tool.

### Example

```ts
import {
  Configuration,
  ToolsApi,
} from '';
import type { DeleteToolToolsToolIdDeleteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ToolsApi();

  const body = {
    // string
    toolId: toolId_example,
  } satisfies DeleteToolToolsToolIdDeleteRequest;

  try {
    const data = await api.deleteToolToolsToolIdDelete(body);
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
| **toolId** | `string` |  | [Defaults to `undefined`] |

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


## listToolsToolsGet

> Array&lt;ToolDefinition&gt; listToolsToolsGet()

List Tools

List all available tools and their status.

### Example

```ts
import {
  Configuration,
  ToolsApi,
} from '';
import type { ListToolsToolsGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ToolsApi();

  try {
    const data = await api.listToolsToolsGet();
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

[**Array&lt;ToolDefinition&gt;**](ToolDefinition.md)

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


## toggleToolToolsToolIdTogglePost

> ToolDefinition toggleToolToolsToolIdTogglePost(toolId, enabled)

Toggle Tool

Enable or disable a tool.

### Example

```ts
import {
  Configuration,
  ToolsApi,
} from '';
import type { ToggleToolToolsToolIdTogglePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ToolsApi();

  const body = {
    // string
    toolId: toolId_example,
    // boolean
    enabled: true,
  } satisfies ToggleToolToolsToolIdTogglePostRequest;

  try {
    const data = await api.toggleToolToolsToolIdTogglePost(body);
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
| **toolId** | `string` |  | [Defaults to `undefined`] |
| **enabled** | `boolean` |  | [Defaults to `undefined`] |

### Return type

[**ToolDefinition**](ToolDefinition.md)

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

