# WorkspacesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createWorkspaceWorkspacesPost**](WorkspacesApi.md#createworkspaceworkspacespost) | **POST** /workspaces | Create Workspace |
| [**createWorkspaceWorkspacesPost_0**](WorkspacesApi.md#createworkspaceworkspacespost_0) | **POST** /workspaces/ | Create Workspace |
| [**deleteWorkspaceWorkspacesWorkspaceIdDelete**](WorkspacesApi.md#deleteworkspaceworkspacesworkspaceiddelete) | **DELETE** /workspaces/{workspace_id} | Delete Workspace |
| [**getWorkspaceDetailsWorkspacesWorkspaceIdDetailsGet**](WorkspacesApi.md#getworkspacedetailsworkspacesworkspaceiddetailsget) | **GET** /workspaces/{workspace_id}/details | Get Workspace Details |
| [**getWorkspaceGraphWorkspacesWorkspaceIdGraphGet**](WorkspacesApi.md#getworkspacegraphworkspacesworkspaceidgraphget) | **GET** /workspaces/{workspace_id}/graph | Get Workspace Graph |
| [**listWorkspacesWorkspacesGet**](WorkspacesApi.md#listworkspacesworkspacesget) | **GET** /workspaces | List Workspaces |
| [**listWorkspacesWorkspacesGet_0**](WorkspacesApi.md#listworkspacesworkspacesget_0) | **GET** /workspaces/ | List Workspaces |
| [**shareDocumentWorkspacesWorkspaceIdShareDocumentPost**](WorkspacesApi.md#sharedocumentworkspacesworkspaceidsharedocumentpost) | **POST** /workspaces/{workspace_id}/share-document | Share Document |
| [**updateWorkspaceWorkspacesWorkspaceIdPatch**](WorkspacesApi.md#updateworkspaceworkspacesworkspaceidpatch) | **PATCH** /workspaces/{workspace_id} | Update Workspace |



## createWorkspaceWorkspacesPost

> any createWorkspaceWorkspacesPost(workspaceCreate)

Create Workspace

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { CreateWorkspaceWorkspacesPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // WorkspaceCreate
    workspaceCreate: ...,
  } satisfies CreateWorkspaceWorkspacesPostRequest;

  try {
    const data = await api.createWorkspaceWorkspacesPost(body);
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
| **workspaceCreate** | [WorkspaceCreate](WorkspaceCreate.md) |  | |

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


## createWorkspaceWorkspacesPost_0

> any createWorkspaceWorkspacesPost_0(workspaceCreate)

Create Workspace

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { CreateWorkspaceWorkspacesPost0Request } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // WorkspaceCreate
    workspaceCreate: ...,
  } satisfies CreateWorkspaceWorkspacesPost0Request;

  try {
    const data = await api.createWorkspaceWorkspacesPost_0(body);
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
| **workspaceCreate** | [WorkspaceCreate](WorkspaceCreate.md) |  | |

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


## deleteWorkspaceWorkspacesWorkspaceIdDelete

> any deleteWorkspaceWorkspacesWorkspaceIdDelete(workspaceId, vaultDelete)

Delete Workspace

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { DeleteWorkspaceWorkspacesWorkspaceIdDeleteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // string
    workspaceId: workspaceId_example,
    // boolean (optional)
    vaultDelete: true,
  } satisfies DeleteWorkspaceWorkspacesWorkspaceIdDeleteRequest;

  try {
    const data = await api.deleteWorkspaceWorkspacesWorkspaceIdDelete(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **vaultDelete** | `boolean` |  | [Optional] [Defaults to `false`] |

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


## getWorkspaceDetailsWorkspacesWorkspaceIdDetailsGet

> WorkspaceDetail getWorkspaceDetailsWorkspacesWorkspaceIdDetailsGet(workspaceId)

Get Workspace Details

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { GetWorkspaceDetailsWorkspacesWorkspaceIdDetailsGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies GetWorkspaceDetailsWorkspacesWorkspaceIdDetailsGetRequest;

  try {
    const data = await api.getWorkspaceDetailsWorkspacesWorkspaceIdDetailsGet(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**WorkspaceDetail**](WorkspaceDetail.md)

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


## getWorkspaceGraphWorkspacesWorkspaceIdGraphGet

> any getWorkspaceGraphWorkspacesWorkspaceIdGraphGet(workspaceId)

Get Workspace Graph

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { GetWorkspaceGraphWorkspacesWorkspaceIdGraphGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies GetWorkspaceGraphWorkspacesWorkspaceIdGraphGetRequest;

  try {
    const data = await api.getWorkspaceGraphWorkspacesWorkspaceIdGraphGet(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

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


## listWorkspacesWorkspacesGet

> AppResponseListWorkspace listWorkspacesWorkspacesGet()

List Workspaces

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { ListWorkspacesWorkspacesGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  try {
    const data = await api.listWorkspacesWorkspacesGet();
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

[**AppResponseListWorkspace**](AppResponseListWorkspace.md)

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


## listWorkspacesWorkspacesGet_0

> AppResponseListWorkspace listWorkspacesWorkspacesGet_0()

List Workspaces

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { ListWorkspacesWorkspacesGet0Request } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  try {
    const data = await api.listWorkspacesWorkspacesGet_0();
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

[**AppResponseListWorkspace**](AppResponseListWorkspace.md)

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


## shareDocumentWorkspacesWorkspaceIdShareDocumentPost

> any shareDocumentWorkspacesWorkspaceIdShareDocumentPost(workspaceId)

Share Document

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { ShareDocumentWorkspacesWorkspaceIdShareDocumentPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies ShareDocumentWorkspacesWorkspaceIdShareDocumentPostRequest;

  try {
    const data = await api.shareDocumentWorkspacesWorkspaceIdShareDocumentPost(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

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


## updateWorkspaceWorkspacesWorkspaceIdPatch

> Workspace updateWorkspaceWorkspacesWorkspaceIdPatch(workspaceId, workspaceUpdate)

Update Workspace

### Example

```ts
import {
  Configuration,
  WorkspacesApi,
} from '';
import type { UpdateWorkspaceWorkspacesWorkspaceIdPatchRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new WorkspacesApi();

  const body = {
    // string
    workspaceId: workspaceId_example,
    // WorkspaceUpdate
    workspaceUpdate: ...,
  } satisfies UpdateWorkspaceWorkspacesWorkspaceIdPatchRequest;

  try {
    const data = await api.updateWorkspaceWorkspacesWorkspaceIdPatch(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **workspaceUpdate** | [WorkspaceUpdate](WorkspaceUpdate.md) |  | |

### Return type

[**Workspace**](Workspace.md)

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

