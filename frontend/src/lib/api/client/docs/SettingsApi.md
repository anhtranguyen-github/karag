# SettingsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getSettingsSettingsGet**](SettingsApi.md#getsettingssettingsget) | **GET** /settings/ | Get Settings |
| [**updateSettingsSettingsPatch**](SettingsApi.md#updatesettingssettingspatch) | **PATCH** /settings/ | Update Settings |



## getSettingsSettingsGet

> AppSettings getSettingsSettingsGet(workspaceId)

Get Settings

Get settings for a specific workspace or global defaults.

### Example

```ts
import {
  Configuration,
  SettingsApi,
} from '';
import type { GetSettingsSettingsGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SettingsApi();

  const body = {
    // string (optional)
    workspaceId: workspaceId_example,
  } satisfies GetSettingsSettingsGetRequest;

  try {
    const data = await api.getSettingsSettingsGet(body);
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
| **workspaceId** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AppSettings**](AppSettings.md)

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


## updateSettingsSettingsPatch

> AppSettings updateSettingsSettingsPatch(requestBody, workspaceId)

Update Settings

Update settings for a specific workspace or global defaults.

### Example

```ts
import {
  Configuration,
  SettingsApi,
} from '';
import type { UpdateSettingsSettingsPatchRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SettingsApi();

  const body = {
    // { [key: string]: any; }
    requestBody: Object,
    // string (optional)
    workspaceId: workspaceId_example,
  } satisfies UpdateSettingsSettingsPatchRequest;

  try {
    const data = await api.updateSettingsSettingsPatch(body);
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
| **requestBody** | `{ [key: string]: any; }` |  | |
| **workspaceId** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AppSettings**](AppSettings.md)

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

