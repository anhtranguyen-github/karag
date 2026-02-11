
# AppResponseListWorkspace


## Properties

Name | Type
------------ | -------------
`success` | boolean
`code` | string
`message` | string
`data` | [Array&lt;Workspace&gt;](Workspace.md)

## Example

```typescript
import type { AppResponseListWorkspace } from ''

// TODO: Update the object below with actual values
const example = {
  "success": null,
  "code": null,
  "message": null,
  "data": null,
} satisfies AppResponseListWorkspace

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AppResponseListWorkspace
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


