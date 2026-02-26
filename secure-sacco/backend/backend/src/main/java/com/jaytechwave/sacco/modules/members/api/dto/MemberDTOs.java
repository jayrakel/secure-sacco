package com.jaytechwave.sacco.modules.members.api.dto;

import com.jaytechwave.sacco.modules.members.domain.entity.Gender;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

public class MemberDTOs {

    @Data
    public static class CreateMemberRequest {
        @NotBlank(message = "First name is required")
        private String firstName;
        private String middleName;
        @NotBlank(message = "Last name is required")
        private String lastName;
        private String nationalId;
        private String phoneNumber;
        @Email(message = "Invalid email format")
        private String email;
        private LocalDate dateOfBirth;
        private Gender gender;
    }

    @Data
    public static class UpdateMemberRequest {
        @NotBlank(message = "First name is required")
        private String firstName;
        private String middleName;
        @NotBlank(message = "Last name is required")
        private String lastName;
        private String nationalId;
        private String phoneNumber;
        @Email(message = "Invalid email format")
        private String email;
        private LocalDate dateOfBirth;
        private Gender gender;
    }

    @Data
    public static class UpdateStatusRequest {
        private MemberStatus status;
    }

    @Data
    @Builder
    public static class MemberResponse {
        private UUID id;
        private String memberNumber;
        private String firstName;
        private String middleName;
        private String lastName;
        private String nationalId;
        private String phoneNumber;
        private String email;
        private LocalDate dateOfBirth;
        private Gender gender;
        private MemberStatus status;
        private ZonedDateTime createdAt;
        private ZonedDateTime updatedAt;

        public static MemberResponse fromEntity(Member member) {
            return MemberResponse.builder()
                    .id(member.getId())
                    .memberNumber(member.getMemberNumber())
                    .firstName(member.getFirstName())
                    .middleName(member.getMiddleName())
                    .lastName(member.getLastName())
                    .nationalId(member.getNationalId())
                    .phoneNumber(member.getPhoneNumber())
                    .email(member.getEmail())
                    .dateOfBirth(member.getDateOfBirth())
                    .gender(member.getGender())
                    .status(member.getStatus())
                    .createdAt(member.getCreatedAt())
                    .updatedAt(member.getUpdatedAt())
                    .build();
        }
    }
}