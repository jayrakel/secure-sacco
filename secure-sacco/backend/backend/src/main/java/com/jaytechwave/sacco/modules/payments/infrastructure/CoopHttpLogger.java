package com.jaytechwave.sacco.modules.payments.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.util.StreamUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Logs every Co-op Connect HTTP exchange in Postman-style JSON format.
 * Nothing is masked — full token and response body are logged as-is.
 * Temporary — revert once Co-op investigation is resolved.
 */
@Slf4j
public class CoopHttpLogger implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request,
                                        byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {

        String requestBody = new String(body, StandardCharsets.UTF_8)
                .replaceAll("\\r?\\n\\s*", " ").trim();

        String authHeader = request.getHeaders().getFirst("Authorization") != null
                ? request.getHeaders().getFirst("Authorization")
                : "none";

        log.info("[CO-OP HTTP] REQUEST:\n" +
                "{\n" +
                "  \"name\": \"" + request.getURI().getPath() + "\",\n" +
                "  \"request\": {\n" +
                "    \"auth\": { \"type\": \"bearer\", \"bearer\": [{ \"key\": \"token\", \"value\": \"" + authHeader + "\", \"type\": \"string\" }] },\n" +
                "    \"method\": \"" + request.getMethod() + "\",\n" +
                "    \"header\": [],\n" +
                "    \"body\": {\n" +
                "      \"mode\": \"raw\",\n" +
                "      \"raw\": " + requestBody + ",\n" +
                "      \"options\": { \"raw\": { \"language\": \"json\" } }\n" +
                "    },\n" +
                "    \"url\": { \"raw\": \"" + request.getURI() + "\" }\n" +
                "  }\n" +
                "}");

        ClientHttpResponse response = execution.execute(request, body);
        return logResponse(request, response);
    }

    private ClientHttpResponse logResponse(HttpRequest request,
                                           ClientHttpResponse response) throws IOException {
        byte[] responseBody = StreamUtils.copyToByteArray(response.getBody());
        String responseStr = new String(responseBody, StandardCharsets.UTF_8)
                .replaceAll("\\r?\\n\\s*", " ").trim();

        log.info("[CO-OP HTTP] RESPONSE (Postman format):\n" +
                "{\n" +
                "  \"name\": \"" + request.getURI().getPath() + "\",\n" +
                "  \"response\": [\n" +
                "    {\n" +
                "      \"name\": \"" + request.getURI().getPath() + "\",\n" +
                "      \"originalRequest\": {\n" +
                "        \"method\": \"POST\",\n" +
                "        \"url\": { \"raw\": \"" + request.getURI() + "\" }\n" +
                "      },\n" +
                "      \"status\": \"" + response.getStatusCode().value() + "\",\n" +
                "      \"code\": " + response.getStatusCode().value() + ",\n" +
                "      \"body\": " + responseStr + "\n" +
                "    }\n" +
                "  ]\n" +
                "}");

        return new BufferedClientHttpResponse(response, responseBody);
    }

    private static class BufferedClientHttpResponse implements ClientHttpResponse {
        private final ClientHttpResponse original;
        private final byte[] body;

        BufferedClientHttpResponse(ClientHttpResponse original, byte[] body) {
            this.original = original;
            this.body = body;
        }

        @Override public InputStream getBody() { return new ByteArrayInputStream(body); }
        @Override public org.springframework.http.HttpHeaders getHeaders() { return original.getHeaders(); }
        @Override public org.springframework.http.HttpStatusCode getStatusCode() throws IOException { return original.getStatusCode(); }
        @Override public String getStatusText() throws IOException { return original.getStatusText(); }
        @Override public void close() { original.close(); }
    }
}