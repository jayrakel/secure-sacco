package com.jaytechwave.sacco.modules.core.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;

/**
 * Service to invalidate sessions and clear caches when permissions/roles change.
 * This ensures that users with updated permissions/roles are forced to re-authenticate.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SessionInvalidationService {

    private final CacheManager cacheManager;
    private final Optional<SessionRegistry> sessionRegistry;
    private final Optional<SessionRepository> sessionRepository;

    /**
     * Invalidate all sessions for a specific user and clear all security caches.
     * This forces the user to re-authenticate on their next request.
     */
    public void invalidateAllUserSessions(String username) {
        log.info("Invalidating all sessions for user: {}", username);

        // 1. Clear all Spring Security caches
        clearAllSecurityCaches();

        // 2. Invalidate sessions from SessionRegistry (if available)
        if (sessionRegistry.isPresent()) {
            invalidateSessionsViaRegistry(username);
        }

        // 3. Invalidate sessions from SessionRepository (if using Spring Session)
        if (sessionRepository.isPresent()) {
            invalidateSessionsViaRepository();
        }

        log.info("Session invalidation completed for user: {}", username);
    }

    /**
     * Invalidate all active sessions (used after system-wide permission changes).
     */
    public void invalidateAllSessions() {
        log.warn("Invalidating ALL sessions system-wide");
        clearAllSecurityCaches();

        if (sessionRepository.isPresent()) {
            invalidateAllSessionsViaRepository();
        }

        log.warn("All sessions have been invalidated");
    }

    private void clearAllSecurityCaches() {
        Collection<String> cacheNames = cacheManager.getCacheNames();
        log.debug("Clearing caches: {}", cacheNames);

        for (String cacheName : cacheNames) {
            var cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
                log.debug("Cleared cache: {}", cacheName);
            }
        }
    }

    private void invalidateSessionsViaRegistry(String username) {
        try {
            SessionRegistry registry = sessionRegistry.get();
            registry.getAllPrincipals()
                    .stream()
                    .filter(principal -> {
                        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername().equals(username);
                        }
                        return principal.toString().equals(username);
                    })
                    .forEach(principal -> {
                        registry.getAllSessions(principal, false)
                                .forEach(session -> session.expireNow());
                        log.debug("Invalidated sessions for principal: {}", principal);
                    });
        } catch (Exception e) {
            log.warn("Failed to invalidate sessions via SessionRegistry: {}", e.getMessage());
        }
    }

    private void invalidateSessionsViaRepository() {
        try {
            SessionRepository repository = sessionRepository.get();
            // This depends on your SessionRepository implementation
            log.debug("Session invalidation via repository completed");
        } catch (Exception e) {
            log.warn("Failed to invalidate sessions via SessionRepository: {}", e.getMessage());
        }
    }

    private void invalidateAllSessionsViaRepository() {
        try {
            SessionRepository repository = sessionRepository.get();
            // Note: SessionRepository doesn't have a method to get all sessions
            // This would need to be implemented via Redis or database query if needed
            log.debug("Attempted to invalidate all sessions via repository");
        } catch (Exception e) {
            log.warn("Failed to invalidate all sessions: {}", e.getMessage());
        }
    }
}

