class SaccoSettingsResponse {
  final bool initialized;
  final String? saccoName;
  final String? prefix;
  final int? padLength;
  final double? registrationFee;
  final String? logoUrl;
  final String? faviconUrl;
  
  final String? smtpFromName;
  final String? supportEmail;
  
  final int? maxLoginAttempts;
  final int? lockoutDurationMinutes;
  final int? sessionTimeoutMinutes;
  final int? passwordResetExpiryMin;
  final int? mfaTokenExpiryMinutes;
  final int? emailVerifyExpiryHours;
  final int? minPasswordLength;
  final int? contactVerifyRateLimit;
  final int? contactVerifyWindowMin;
  final int? rateLimitGeneralPerMin;
  
  final String? savingsDay;
  final bool? savingsDeadlineNextDay;
  final int? savingsDeadlineHour;
  final int? savingsDeadlineMinute;
  
  final int? meetingNotificationLeadHours;
  
  final double? minSavingsToBorrow;
  final int? minMembershipMonths;
  final double? borrowingMultiplier;
  final double? maxCreditScoreMultiplier;
  final int? minGuarantorsCount;
  final double? guarantorCapacityPct;
  final double? processingFee;
  final bool? sharesCountBorrowing;
  final bool? sharesCountGuarantor;

  final Map<String, dynamic>? enabledModules;

  SaccoSettingsResponse({
    required this.initialized,
    this.saccoName,
    this.prefix,
    this.padLength,
    this.registrationFee,
    this.logoUrl,
    this.faviconUrl,
    this.smtpFromName,
    this.supportEmail,
    this.maxLoginAttempts,
    this.lockoutDurationMinutes,
    this.sessionTimeoutMinutes,
    this.passwordResetExpiryMin,
    this.mfaTokenExpiryMinutes,
    this.emailVerifyExpiryHours,
    this.minPasswordLength,
    this.contactVerifyRateLimit,
    this.contactVerifyWindowMin,
    this.rateLimitGeneralPerMin,
    this.savingsDay,
    this.savingsDeadlineNextDay,
    this.savingsDeadlineHour,
    this.savingsDeadlineMinute,
    this.meetingNotificationLeadHours,
    this.minSavingsToBorrow,
    this.minMembershipMonths,
    this.borrowingMultiplier,
    this.maxCreditScoreMultiplier,
    this.minGuarantorsCount,
    this.guarantorCapacityPct,
    this.processingFee,
    this.sharesCountBorrowing,
    this.sharesCountGuarantor,
    this.enabledModules,
  });

  factory SaccoSettingsResponse.fromJson(Map<String, dynamic> json) {
    return SaccoSettingsResponse(
      initialized: json['initialized'] ?? false,
      saccoName: json['saccoName'],
      prefix: json['prefix'],
      padLength: json['padLength'],
      registrationFee: json['registrationFee'] != null ? (json['registrationFee'] as num).toDouble() : null,
      logoUrl: json['logoUrl'],
      faviconUrl: json['faviconUrl'],
      smtpFromName: json['smtpFromName'],
      supportEmail: json['supportEmail'],
      maxLoginAttempts: json['maxLoginAttempts'],
      lockoutDurationMinutes: json['lockoutDurationMinutes'],
      sessionTimeoutMinutes: json['sessionTimeoutMinutes'],
      passwordResetExpiryMin: json['passwordResetExpiryMin'],
      mfaTokenExpiryMinutes: json['mfaTokenExpiryMinutes'],
      emailVerifyExpiryHours: json['emailVerifyExpiryHours'],
      minPasswordLength: json['minPasswordLength'],
      contactVerifyRateLimit: json['contactVerifyRateLimit'],
      contactVerifyWindowMin: json['contactVerifyWindowMin'],
      rateLimitGeneralPerMin: json['rateLimitGeneralPerMin'],
      savingsDay: json['savingsDay'],
      savingsDeadlineNextDay: json['savingsDeadlineNextDay'],
      savingsDeadlineHour: json['savingsDeadlineHour'],
      savingsDeadlineMinute: json['savingsDeadlineMinute'],
      meetingNotificationLeadHours: json['meetingNotificationLeadHours'],
      minSavingsToBorrow: json['minSavingsToBorrow'] != null ? (json['minSavingsToBorrow'] as num).toDouble() : null,
      minMembershipMonths: json['minMembershipMonths'],
      borrowingMultiplier: json['borrowingMultiplier'] != null ? (json['borrowingMultiplier'] as num).toDouble() : null,
      maxCreditScoreMultiplier: json['maxCreditScoreMultiplier'] != null ? (json['maxCreditScoreMultiplier'] as num).toDouble() : null,
      minGuarantorsCount: json['minGuarantorsCount'],
      guarantorCapacityPct: json['guarantorCapacityPct'] != null ? (json['guarantorCapacityPct'] as num).toDouble() : null,
      processingFee: json['processingFee'] != null ? (json['processingFee'] as num).toDouble() : null,
      sharesCountBorrowing: json['sharesCountBorrowing'],
      sharesCountGuarantor: json['sharesCountGuarantor'],
      enabledModules: json['enabledModules'],
    );
  }
}

class UpdateCoreRequest {
  final String saccoName;
  final String prefix;
  final int padLength;
  final double registrationFee;
  final String? logoUrl;
  final String? faviconUrl;

  UpdateCoreRequest({
    required this.saccoName,
    required this.prefix,
    required this.padLength,
    required this.registrationFee,
    this.logoUrl,
    this.faviconUrl,
  });

  Map<String, dynamic> toJson() {
    return {
      'saccoName': saccoName,
      'prefix': prefix,
      'padLength': padLength,
      'registrationFee': registrationFee,
      'logoUrl': logoUrl,
      'faviconUrl': faviconUrl,
    };
  }
}

class UpdateSecurityPolicyRequest {
  final int maxLoginAttempts;
  final int lockoutDurationMinutes;
  final int sessionTimeoutMinutes;
  final int passwordResetExpiryMin;
  final int mfaTokenExpiryMinutes;
  final int emailVerifyExpiryHours;
  final int minPasswordLength;
  final int contactVerifyRateLimit;
  final int contactVerifyWindowMin;
  final int rateLimitGeneralPerMin;

  UpdateSecurityPolicyRequest({
    required this.maxLoginAttempts,
    required this.lockoutDurationMinutes,
    required this.sessionTimeoutMinutes,
    required this.passwordResetExpiryMin,
    required this.mfaTokenExpiryMinutes,
    required this.emailVerifyExpiryHours,
    required this.minPasswordLength,
    required this.contactVerifyRateLimit,
    required this.contactVerifyWindowMin,
    required this.rateLimitGeneralPerMin,
  });

  Map<String, dynamic> toJson() {
    return {
      'maxLoginAttempts': maxLoginAttempts,
      'lockoutDurationMinutes': lockoutDurationMinutes,
      'sessionTimeoutMinutes': sessionTimeoutMinutes,
      'passwordResetExpiryMin': passwordResetExpiryMin,
      'mfaTokenExpiryMinutes': mfaTokenExpiryMinutes,
      'emailVerifyExpiryHours': emailVerifyExpiryHours,
      'minPasswordLength': minPasswordLength,
      'contactVerifyRateLimit': contactVerifyRateLimit,
      'contactVerifyWindowMin': contactVerifyWindowMin,
      'rateLimitGeneralPerMin': rateLimitGeneralPerMin,
    };
  }
}

class UpdateCommunicationRequest {
  final String smtpFromName;
  final String? supportEmail;

  UpdateCommunicationRequest({
    required this.smtpFromName,
    this.supportEmail,
  });

  Map<String, dynamic> toJson() {
    return {
      'smtpFromName': smtpFromName,
      'supportEmail': supportEmail,
    };
  }
}

class UpdateFlagsRequest {
  final Map<String, bool> flags;

  UpdateFlagsRequest({required this.flags});

  Map<String, dynamic> toJson() {
    return {
      'flags': flags,
    };
  }
}

class UpdateSavingsScheduleRequest {
  final String savingsDay;
  final bool savingsDeadlineNextDay;
  final int savingsDeadlineHour;
  final int savingsDeadlineMinute;

  UpdateSavingsScheduleRequest({
    required this.savingsDay,
    required this.savingsDeadlineNextDay,
    required this.savingsDeadlineHour,
    required this.savingsDeadlineMinute,
  });

  Map<String, dynamic> toJson() {
    return {
      'savingsDay': savingsDay,
      'savingsDeadlineNextDay': savingsDeadlineNextDay,
      'savingsDeadlineHour': savingsDeadlineHour,
      'savingsDeadlineMinute': savingsDeadlineMinute,
    };
  }
}

class UpdateMeetingsRequest {
  final int meetingNotificationLeadHours;

  UpdateMeetingsRequest({required this.meetingNotificationLeadHours});

  Map<String, dynamic> toJson() {
    return {
      'meetingNotificationLeadHours': meetingNotificationLeadHours,
    };
  }
}

class UpdateLoansRequest {
  final double minSavingsToBorrow;
  final int minMembershipMonths;
  final double borrowingMultiplier;
  final double maxCreditScoreMultiplier;
  final int minGuarantorsCount;
  final double guarantorCapacityPct;
  final double processingFee;
  final bool sharesCountBorrowing;
  final bool sharesCountGuarantor;

  UpdateLoansRequest({
    required this.minSavingsToBorrow,
    required this.minMembershipMonths,
    required this.borrowingMultiplier,
    required this.maxCreditScoreMultiplier,
    required this.minGuarantorsCount,
    required this.guarantorCapacityPct,
    required this.processingFee,
    required this.sharesCountBorrowing,
    required this.sharesCountGuarantor,
  });

  Map<String, dynamic> toJson() {
    return {
      'minSavingsToBorrow': minSavingsToBorrow,
      'minMembershipMonths': minMembershipMonths,
      'borrowingMultiplier': borrowingMultiplier,
      'maxCreditScoreMultiplier': maxCreditScoreMultiplier,
      'minGuarantorsCount': minGuarantorsCount,
      'guarantorCapacityPct': guarantorCapacityPct,
      'processingFee': processingFee,
      'sharesCountBorrowing': sharesCountBorrowing,
      'sharesCountGuarantor': sharesCountGuarantor,
    };
  }
}
