package com.jaytechwave.sacco.modules.core.setup;

import com.jaytechwave.sacco.modules.settings.domain.service.SaccoSettingsService;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Computes the current system {@link SetupPhase} by inspecting live DB state.
 *
 * <p>Stateless — safe to call on every request.  Phases must be completed
 * strictly in order; the first unsatisfied phase is returned.
 *
 * <h3>Phase progression</h3>
 * <ol>
 *   <li>{@code CHANGE_PASSWORD} — admin still has {@code must_change_password=true}</li>
 *   <li>{@code VERIFY_CONTACT}  — admin's email or phone is not verified</li>
 *   <li>{@code CREATE_OFFICERS} — at least one of the four mandatory officer roles is unassigned</li>
 *   <li>{@code CONFIGURE_PLATFORM} — {@code sacco_settings} row has not been initialized</li>
 *   <li>{@code COMPLETE}        — everything done; system is live</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class SetupService {

    /** Officer roles that must each have at least one assigned user before setup is complete. */
    static final List<String> REQUIRED_OFFICER_ROLES = List.of(
            "CHAIRPERSON", "SECRETARY", "TREASURER", "LOAN_OFFICER"
    );

    private final UserRepository        userRepository;
    private final SaccoSettingsService  settingsService;

    // ── Public API ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SetupPhase currentPhase() {
        User admin = userRepository.findFirstByRolesName("SYSTEM_ADMIN").orElse(null);

        // No admin yet — system has never been booted (edge case)
        if (admin == null) return SetupPhase.CHANGE_PASSWORD;

        // Phase 1: password not yet changed
        if (admin.isMustChangePassword()) return SetupPhase.CHANGE_PASSWORD;

        // Phase 2: contacts not verified
        if (!admin.isEmailVerified() || !admin.isPhoneVerified()) return SetupPhase.VERIFY_CONTACT;

        // Phase 3: required officers not yet created
        for (String role : REQUIRED_OFFICER_ROLES) {
            if (!userRepository.existsByRolesName(role)) return SetupPhase.CREATE_OFFICERS;
        }

        // Phase 4: platform not configured
        if (!settingsService.isInitialized()) return SetupPhase.CONFIGURE_PLATFORM;

        return SetupPhase.COMPLETE;
    }

    /** Convenience — returns true only when every setup phase has been completed. */
    @Transactional(readOnly = true)
    public boolean isComplete() {
        return currentPhase() == SetupPhase.COMPLETE;
    }

    /** Returns the list of officer roles that still have no assigned user. */
    @Transactional(readOnly = true)
    public List<String> missingOfficerRoles() {
        return REQUIRED_OFFICER_ROLES.stream()
                .filter(role -> !userRepository.existsByRolesName(role))
                .toList();
    }
}