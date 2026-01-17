const BASE_URL = 'https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/School_Characteristics_Current/FeatureServer/0/query'

async function queryNCES(where, outFields, orderBy = null, returnDistinct = false) {
  const params = new URLSearchParams({
    where,
    outFields,
    returnGeometry: 'false',
    f: 'json'
  })

  if (orderBy) {
    params.append('orderByFields', orderBy)
  }

  if (returnDistinct) {
    params.append('returnDistinctValues', 'true')
  }

  const response = await fetch(`${BASE_URL}?${params}`)
  const data = await response.json()
  return data.features?.map(f => f.attributes) || []
}

export async function getStates() {
  const results = await queryNCES('1=1', 'STABR', 'STABR', true)
  return results
    .map(r => r.STABR)
    .filter(Boolean)
    .sort()
}

export async function getDistricts(state) {
  const results = await queryNCES(
    `STABR='${state}'`,
    'LEAID,LEA_NAME',
    'LEA_NAME',
    true
  )
  return results
    .filter(r => r.LEA_NAME)
    .sort((a, b) => a.LEA_NAME.localeCompare(b.LEA_NAME))
}

export async function getSchools(leaid) {
  const results = await queryNCES(
    `LEAID='${leaid}'`,
    'NCESSCH,SCH_NAME',
    'SCH_NAME'
  )
  return results
    .filter(r => r.SCH_NAME)
    .sort((a, b) => a.SCH_NAME.localeCompare(b.SCH_NAME))
}
