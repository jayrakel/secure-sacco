package com.jaytechwave.sacco.modules.core.api;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Guards against excessively large page sizes that could cause memory exhaustion.
 * All paginated controllers should call {@link #validated(Pageable)} before use.
 */
public final class PageSizeValidator {

    public static final int MAX_PAGE_SIZE = 200;
    public static final int DEFAULT_PAGE_SIZE = 20;

    private PageSizeValidator() {}

    /**
     * Returns the given {@link Pageable} if its size is within bounds,
     * or throws {@link IllegalArgumentException} if {@code size > MAX_PAGE_SIZE}.
     */
    public static Pageable validated(Pageable pageable) {
        if (pageable.getPageSize() > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException(
                    "Page size must not exceed " + MAX_PAGE_SIZE +
                            ". Requested: " + pageable.getPageSize());
        }
        return pageable;
    }

    /** Convenience factory — create a safe pageable with default sort. */
    public static Pageable of(int page, int size, String sortField) {
        int safeSize = Math.min(size, MAX_PAGE_SIZE);
        return PageRequest.of(page, safeSize, Sort.by(Sort.Direction.DESC, sortField));
    }
}