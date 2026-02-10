
# WorkspaceCreate


## Properties

Name | Type
------------ | -------------
`name` | string
`description` | string
`ragEngine` | string
`embeddingProvider` | string
`embeddingModel` | string
`embeddingDim` | number
`chunkSize` | number
`chunkOverlap` | number
`neo4jUri` | string
`neo4jUser` | string
`neo4jPassword` | string

## Example

```typescript
import type { WorkspaceCreate } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "description": null,
  "ragEngine": null,
  "embeddingProvider": null,
  "embeddingModel": null,
  "embeddingDim": null,
  "chunkSize": null,
  "chunkOverlap": null,
  "neo4jUri": null,
  "neo4jUser": null,
  "neo4jPassword": null,
} satisfies WorkspaceCreate

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as WorkspaceCreate
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


