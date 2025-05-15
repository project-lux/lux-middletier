import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'

export async function authenticateUser(clientId, username, password) {
  // console.log('authenticateUser clientId:', clientId)
  const client = new CognitoIdentityProviderClient({
    region: 'us-east-1',
  })

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    }
  }

  try {
    const command = new InitiateAuthCommand(params)
    const response = await client.send(command)

    const {
      AuthenticationResult: {
        AccessToken,
        IdToken,
        RefreshToken,
        ExpiresIn
      }
    } = response

    return {
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken,
      expiresIn: ExpiresIn,
    }
  } catch (error) {
    throw new Error(`Failed to authenticate user: ${error.message}`)
  }
}
