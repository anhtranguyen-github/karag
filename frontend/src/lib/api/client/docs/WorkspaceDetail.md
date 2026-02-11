
# WorkspaceDetail


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`description` | string
`stats` | [WorkspaceStats](WorkspaceStats.md)
`threads` | Array&lt;{ [key: string]: any; }&gt;
`documents` | Array&lt;{ [key: string]: any; }&gt;
`settings` | { [key: string]: any; }

## Example

```typescript
import type { WorkspaceDetail } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "description": null,
  "stats": null,
  "threads": null,
  "documents": null,
  "settings": null,
} satisfies WorkspaceDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as WorkspaceDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


