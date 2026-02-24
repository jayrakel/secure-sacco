package com.jaytechwave.sacco.modules.roles.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "permissions")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Permission {

    @Id
    @UuidGenerator
    private UUID id;

    // Changed from 'name' to 'code' to match your SQL exactly
    @Column(unique = true, nullable = false)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;
}