const isAgent = (type) => (
  type === 'Group' || type === 'Person'
)

const isConcept = (type) => (
  type === 'Currency' || type === 'Language' || type === 'Material'
  || type === 'MeasurementUnit' || type === 'Type'
)

const isEvent = (type) => (
  type === 'Activity' || type === 'Period'
)

const isItem = (type) => (
  type === 'DigitalObject' || type === 'HumanMadeObject'
)

const isPlace = (type) => (
  type === 'Place'
)

const isSet = (type) => (
  type === 'Set'
)

const isWork = (type) => (
  type === 'LinguisticObject' || type === 'Set' || type === 'VisualItem'
)

export {
  isAgent,
  isConcept,
  isEvent,
  isItem,
  isPlace,
  isSet,
  isWork,
}
