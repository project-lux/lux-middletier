import { client } from 'openid-client'

const issuerUrl = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_a9pmDlRfn/.well-known/openid-configuration'

export async function getServiceToken() {
  const issuer = await Issuer.discover(issuerUrl)
  console.log('Issuer:', issuer)
}
