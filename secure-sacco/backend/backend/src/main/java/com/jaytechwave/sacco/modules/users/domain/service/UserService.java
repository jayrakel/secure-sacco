package com.jaytechwave.sacco.modules.users.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.core.service.PasswordValidator;
import com.jaytechwave.sacco.modules.roles.domain.entity.Role;
import com.jaytechwave.sacco.modules.users.api.dto.UserDTOs.*;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.roles.domain.repository.RoleRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;
    private final SecurityAuditService securityAuditService;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAllByIsDeletedFalse().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = getUserEntityById(id);
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        validatePasswordPolicy(request.getPassword());

        String normalizedEmail = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email already exists");
        }

        Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
        if (roles.isEmpty()) {
            throw new IllegalArgumentException("Valid roles must be provided");
        }

        // Staff users must change their temp password on first login and verify
        // their email/phone before gaining access to the system.
        // - MustChangePasswordFilter enforces mustChangePassword = true
        // - ContactVerificationFilter enforces emailVerified + phoneVerified
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(normalizedEmail)
                .officialEmail(normalizeOptionalEmail(request.getOfficialEmail()))
                .phoneNumber(normalizePhone(request.getPhoneNumber()))
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(UserStatus.ACTIVE)
                .mustChangePassword(true)
                .emailVerified(false)
                .phoneVerified(false)
                .isDeleted(false)
                .roles(roles)
                .build();

        UserResponse response = mapToResponse(userRepository.save(user));

        securityAuditService.logEvent(
                "USER_CREATED",
                normalizedEmail,
                "Staff user created with roles: " + roles.stream().map(Role::getName).collect(Collectors.joining(", "))
        );

        return response;
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = getUserEntityById(id);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(normalizePhone(request.getPhoneNumber()));
        UserResponse response = mapToResponse(userRepository.save(user));

        securityAuditService.logEvent(
                "USER_UPDATED",
                user.getEmail(),
                "User profile updated"
        );

        return response;
    }

    @Transactional
    public void updateUserStatus(UUID id, UserStatus newStatus) {
        User user = getUserEntityById(id);
        UserStatus previous = user.getStatus();
        user.setStatus(newStatus);
        userRepository.save(user);

        securityAuditService.logEvent(
                "USER_STATUS_UPDATED",
                user.getEmail(),
                "Status changed from " + previous + " to " + newStatus
        );
    }

    @Transactional
    public void updateUserRoles(UUID id, Set<UUID> roleIds) {
        User user = getUserEntityById(id);
        Set<Role> roles = new HashSet<>(roleRepository.findAllById(roleIds));
        if (roles.isEmpty()) {
            throw new IllegalArgumentException("Valid roles must be provided");
        }
        user.setRoles(roles);
        userRepository.save(user);

        securityAuditService.logEvent(
                "USER_ROLES_UPDATED",
                user.getEmail(),
                "Roles updated to: " + roles.stream().map(Role::getName).collect(Collectors.joining(", "))
        );
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = getUserEntityById(id);
        user.setDeleted(true);
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);

        securityAuditService.logEvent(
                "USER_DELETED",
                user.getEmail(),
                "User account soft-deleted"
        );
    }

    // --- HELPER METHODS ---

    private User getUserEntityById(UUID id) {
        return userRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private UserResponse mapToResponse(User user) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .officialEmail(user.getOfficialEmail())
                .phoneNumber(user.getPhoneNumber())
                .status(user.getStatus())
                .roles(roleNames)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        if (email == null || email.isBlank()) return false;
        return userRepository.existsByEmail(email.trim().toLowerCase(Locale.ROOT));
    }

    @Transactional
    public User createBootstrapSystemAdmin(
            String firstName, String lastName, String loginEmail,
            String officialEmail, String phoneNumber, String rawPassword,
            boolean mustChangePassword
    ) {
        validatePasswordPolicy(rawPassword);

        String normalizedLoginEmail = normalizeEmail(loginEmail);
        String normalizedOfficialEmail = normalizeEmail(officialEmail);
        String normalizedPhone = normalizePhone(phoneNumber);

        if (userRepository.existsByEmail(normalizedLoginEmail)) {
            throw new IllegalStateException("User already exists with email: " + normalizedLoginEmail);
        }

        var systemAdminRole = roleRepository.findByName("SYSTEM_ADMIN")
                .orElseThrow(() -> new IllegalStateException("SYSTEM_ADMIN role not found."));

        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(normalizedLoginEmail)
                .officialEmail(normalizedOfficialEmail)
                .phoneNumber(normalizedPhone)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .status(UserStatus.ACTIVE)
                .isDeleted(false)
                .mustChangePassword(mustChangePassword)
                .build();

        user.getRoles().add(systemAdminRole);
        return userRepository.save(user);
    }

    @Transactional
    public void createNewUser(User user, String rawPassword) {
        validatePasswordPolicy(rawPassword);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }

    public void changePassword(User user, String newRawPassword) {
        validatePasswordPolicy(newRawPassword);
        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        userRepository.save(user);
    }

    private void validatePasswordPolicy(String rawPassword) {
        if (!passwordValidator.isValid(rawPassword)) {
            throw new IllegalArgumentException(passwordValidator.getRequirementsMessage());
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Email is required");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Same as normalizeEmail but returns null instead of throwing — for optional email fields. */
    private String normalizeOptionalEmail(String email) {
        if (email == null || email.isBlank()) return null;
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        return phone.trim();
    }
}