package com.jaytechwave.sacco.modules.users.domain.service;

import com.jaytechwave.sacco.modules.core.service.PasswordValidator;
import com.jaytechwave.sacco.modules.roles.domain.entity.Role;
import com.jaytechwave.sacco.modules.users.api.dto.UserDTOs.*; // FIXED: Added wildcard to import inner DTO classes
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.roles.domain.repository.RoleRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet; // FIXED: Imported HashSet
import java.util.List;
import java.util.Locale;
import java.util.Set;     // FIXED: Imported Set
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;

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

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(normalizedEmail)
                .officialEmail(normalizeEmail(request.getOfficialEmail()))
                .phoneNumber(normalizePhone(request.getPhoneNumber()))
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(UserStatus.ACTIVE)
                .isDeleted(false)
                .roles(roles)
                .build();

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = getUserEntityById(id);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(normalizePhone(request.getPhoneNumber()));
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void updateUserStatus(UUID id, UserStatus newStatus) {
        User user = getUserEntityById(id);
        user.setStatus(newStatus);
        userRepository.save(user);
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
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = getUserEntityById(id);
        user.setDeleted(true);
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);
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
            String firstName,
            String lastName,
            String loginEmail,
            String officialEmail,
            String phoneNumber,
            String rawPassword
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

    private void validatePasswordPolicy(String rawPassword) {
        if (!passwordValidator.isValid(rawPassword)) {
            throw new IllegalArgumentException(passwordValidator.getRequirementsMessage());
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Email is required");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        return phone.trim();
    }
}