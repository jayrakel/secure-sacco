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
 * Logs the complete HTTP request and response for every Co-op Connect API call.
 * Wire into the RestClient builder in CoopConnectService.
 *
 * Output appears in backend logs at INFO level under the tag [CO-OP HTTP].
 * Co-op support can be sent the full block between ──── REQUEST ──── and ──── END ────
 */
@Slf4j
public class CoopHttpLogger implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request,
                                        byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {

        logRequest(request, body);
        ClientHttpResponse response = execution.execute(request, body);
        return logResponse(request, response);
    }

    private void logRequest(HttpRequest request, byte[] body) {
        String bodyStr = new String(body, StandardCharsets.UTF_8);
        // Mask the Authorization header value for safe sharing
        String authHeader = request.getHeaders().getFirst("Authorization");
        String maskedAuth = authHeader != null
                ? authHeader.substring(0, Math.min(authHeader.length(), 20)) + "...[MASKED]"
                : "none";

        log.info("""
                [CO-OP HTTP] ──── REQUEST ────────────────────────────────────────
                [CO-OP HTTP] {} {}
                [CO-OP HTTP] Authorization: {}
                [CO-OP HTTP] Content-Type: {}
                [CO-OP HTTP] Body: {}
                [CO-OP HTTP] ──────────────────────────────────────────────────────""",
                request.getMethod(),
                request.getURI(),
                maskedAuth,
                request.getHeaders().getFirst("Content-Type"),
                bodyStr);
    }

    private ClientHttpResponse logResponse(HttpRequest request, ClientHttpResponse response) throws IOException {
        byte[] responseBody = StreamUtils.copyToByteArray(response.getBody());
        String responseStr = new String(responseBody, StandardCharsets.UTF_8);

        log.info("""
                [CO-OP HTTP] ──── RESPONSE ───────────────────────────────────────
                [CO-OP HTTP] {} {} → HTTP {}
                [CO-OP HTTP] Body: {}
                [CO-OP HTTP] ──── END ────────────────────────────────────────────""",
                request.getMethod(),
                request.getURI(),
                response.getStatusCode().value(),
                responseStr);

        // Return a buffered response since we've consumed the body stream
        return new BufferedClientHttpResponse(response, responseBody);
    }

    /**
     * Wraps the response to allow the body to be read again after we've already read it.
     */
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