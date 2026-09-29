import React, { useState, useEffect } from 'react';
import apiClient from '../api/api-client';

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    fallback?: React.ReactNode;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, fallback, ...props }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        if (!src) return;

        // If the URL is already absolute but not starting with /api, or if we want to ensure it uses the apiClient baseURL
        let fetchUrl = src;
        if (src.startsWith('http://localhost') || src.startsWith('http://127.0.0.1')) {
            const url = new URL(src);
            fetchUrl = url.pathname + url.search;
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
            const url = new URL(src);
            // If it's pointing to the API domain, strip it so apiClient uses relative path and attaches credentials
            if (url.host.includes('betterlinkventures')) {
                fetchUrl = url.pathname + url.search;
            }
        }

        // Prevent double /api/v1 prefix since apiClient baseURL is already /api/v1
        if (fetchUrl.startsWith('/api/v1')) {
            fetchUrl = fetchUrl.replace(/^\/api\/v1/, '');
        }

        apiClient.get(fetchUrl, { responseType: 'blob' })
            .then(response => {
                if (isMounted) {
                    const objectUrl = URL.createObjectURL(response.data);
                    setImageSrc(objectUrl);
                    setError(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setError(true);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (error || !imageSrc) {
        return <>{fallback}</>;
    }

    return <img src={imageSrc} {...props} />;
};
