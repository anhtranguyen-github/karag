# DocumentsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deleteDocumentDocumentsNameDelete**](DocumentsApi.md#deletedocumentdocumentsnamedelete) | **DELETE** /documents/{name} | Delete Document |
| [**getDocumentChunksDocumentsNameChunksGet**](DocumentsApi.md#getdocumentchunksdocumentsnamechunksget) | **GET** /documents/{name}/chunks | Get Document Chunks |
| [**getDocumentDocumentsNameGet**](DocumentsApi.md#getdocumentdocumentsnameget) | **GET** /documents/{name} | Get Document |
| [**inspectDocumentDocumentsNameInspectGet**](DocumentsApi.md#inspectdocumentdocumentsnameinspectget) | **GET** /documents/{name}/inspect | Inspect Document |
| [**listAllDocumentsDocumentsAllGet**](DocumentsApi.md#listalldocumentsdocumentsallget) | **GET** /documents-all | List All Documents |
| [**listDocumentsDocumentsGet**](DocumentsApi.md#listdocumentsdocumentsget) | **GET** /documents | List Documents |
| [**updateDocumentWorkspacesDocumentsUpdateWorkspacesPost**](DocumentsApi.md#updatedocumentworkspacesdocumentsupdateworkspacespost) | **POST** /documents/update-workspaces | Update Document Workspaces |
| [**uploadDocumentUploadPost**](DocumentsApi.md#uploaddocumentuploadpost) | **POST** /upload | Upload Document |



## deleteDocumentDocumentsNameDelete

> any deleteDocumentDocumentsNameDelete(name, workspaceId, vaultDelete)

Delete Document

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { DeleteDocumentDocumentsNameDeleteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  const body = {
    // string
    name: name_example,
    // string (optional)
    workspaceId: workspaceId_example,
    // boolean (optional)
    vaultDelete: true,
  } satisfies DeleteDocumentDocumentsNameDeleteRequest;

  try {
    const data = await api.deleteDocumentDocumentsNameDelete(body);
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
| **name** | `string` |  | [Defaults to `undefined`] |
| **workspaceId** | `string` |  | [Optional] [Defaults to `&#39;default&#39;`] |
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


## getDocumentChunksDocumentsNameChunksGet

> any getDocumentChunksDocumentsNameChunksGet(name, limit)

Get Document Chunks

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { GetDocumentChunksDocumentsNameChunksGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  const body = {
    // string
    name: name_example,
    // number (optional)
    limit: 56,
  } satisfies GetDocumentChunksDocumentsNameChunksGetRequest;

  try {
    const data = await api.getDocumentChunksDocumentsNameChunksGet(body);
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
| **name** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

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


## getDocumentDocumentsNameGet

> any getDocumentDocumentsNameGet(name)

Get Document

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { GetDocumentDocumentsNameGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  const body = {
    // string
    name: name_example,
  } satisfies GetDocumentDocumentsNameGetRequest;

  try {
    const data = await api.getDocumentDocumentsNameGet(body);
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
| **name** | `string` |  | [Defaults to `undefined`] |

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


## inspectDocumentDocumentsNameInspectGet

> any inspectDocumentDocumentsNameInspectGet(name)

Inspect Document

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { InspectDocumentDocumentsNameInspectGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  const body = {
    // string
    name: name_example,
  } satisfies InspectDocumentDocumentsNameInspectGetRequest;

  try {
    const data = await api.inspectDocumentDocumentsNameInspectGet(body);
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
| **name** | `string` |  | [Defaults to `undefined`] |

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


## listAllDocumentsDocumentsAllGet

> any listAllDocumentsDocumentsAllGet()

List All Documents

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { ListAllDocumentsDocumentsAllGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  try {
    const data = await api.listAllDocumentsDocumentsAllGet();
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


## listDocumentsDocumentsGet

> any listDocumentsDocumentsGet(workspaceId)

List Documents

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { ListDocumentsDocumentsGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  const body = {
    // string (optional)
    workspaceId: workspaceId_example,
  } satisfies ListDocumentsDocumentsGetRequest;

  try {
    const data = await api.listDocumentsDocumentsGet(body);
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


## updateDocumentWorkspacesDocumentsUpdateWorkspacesPost

> any updateDocumentWorkspacesDocumentsUpdateWorkspacesPost()

Update Document Workspaces

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { UpdateDocumentWorkspacesDocumentsUpdateWorkspacesPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  try {
    const data = await api.updateDocumentWorkspacesDocumentsUpdateWorkspacesPost();
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


## uploadDocumentUploadPost

> any uploadDocumentUploadPost(file, workspaceId)

Upload Document

### Example

```ts
import {
  Configuration,
  DocumentsApi,
} from '';
import type { UploadDocumentUploadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentsApi();

  const body = {
    // Blob
    file: BINARY_DATA_HERE,
    // string (optional)
    workspaceId: workspaceId_example,
  } satisfies UploadDocumentUploadPostRequest;

  try {
    const data = await api.uploadDocumentUploadPost(body);
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
| **file** | `Blob` |  | [Defaults to `undefined`] |
| **workspaceId** | `string` |  | [Optional] [Defaults to `&#39;default&#39;`] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

