package com.jaytechwave.sacco.modules.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

/**
 * Enables Spring Data web support so that:
 * <ul>
 *   <li>{@code @PageableDefault} annotations on controller method parameters are resolved.</li>
 *   <li>{@link org.springframework.data.domain.Page} responses are serialised cleanly
 *       via the stable DTO shape (no internal Spring metadata leaking into the JSON).</li>
 * </ul>
 *
 * <p>Combined with {@link com.jaytechwave.sacco.modules.core.api.dto.PagedResponse},
 * all paginated list endpoints return a consistent envelope:
 * {@code { content, page, size, totalElements, totalPages, first, last }}.</p>
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
public class WebConfig implements WebMvcConfigurer {
}

