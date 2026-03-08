package com.jaytechwave.sacco.modules.core.api.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Standardised paginated response wrapper used by all list endpoints.
 *
 * <p>Provides a consistent JSON shape across all paginated APIs:
 * <pre>
 * {
 *   "content": [...],
 *   "page": 0,
 *   "size": 20,
 *   "totalElements": 245,
 *   "totalPages": 13,
 *   "first": true,
 *   "last": false
 * }
 * </pre>
 * </p>
 */
public record PagedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
    /**
     * Constructs a {@code PagedResponse} from a Spring Data {@link Page}.
     */
    public static <T> PagedResponse<T> from(Page<T> page) {
        return new PagedResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }
}