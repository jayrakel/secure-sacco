import apiClient from '../../../shared/api/api-client';

export const webAuthnApi = {
    // --- Registration ---
    startRegistration: async () => {
        const response = await apiClient.post('/auth/webauthn/register/options');
        return response.data; // JSON containing PublicKeyCredentialCreationOptions
    },
    
    finishRegistration: async (credentialJson: string, name: string) => {
        const response = await apiClient.post('/auth/webauthn/register', credentialJson, {
            params: { name },
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    },

    // --- Login ---
    startLogin: async (email: string) => {
        const response = await apiClient.post('/auth/webauthn/login/options', null, {
            params: { username: email }
        });
        return response.data; // JSON containing PublicKeyCredentialRequestOptions
    },
    
    finishLogin: async (credentialJson: string) => {
        const response = await apiClient.post('/auth/webauthn/login', credentialJson, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    }
};
