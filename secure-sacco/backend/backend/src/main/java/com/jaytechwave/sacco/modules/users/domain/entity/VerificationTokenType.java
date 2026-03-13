package com.jaytechwave.sacco.modules.users.domain.entity;

public enum VerificationTokenType {
    /** Used during first-time account activation (new member/staff invite flow). */
    EMAIL_ACTIVATION,
    PHONE_ACTIVATION,

    /** Used when an already-ACTIVE user needs to verify their email/phone (e.g. setup wizard, admin-created officers). */
    EMAIL_VERIFICATION,
    PHONE_VERIFICATION
}