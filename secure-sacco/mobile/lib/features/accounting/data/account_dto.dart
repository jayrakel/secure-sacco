class AccountDto {
  final String id;
  final String accountCode;
  final String accountName;
  final String? description;
  final String accountType; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  final bool isActive;
  final bool isSystemAccount;
  final String? parentAccountId;

  AccountDto({
    required this.id,
    required this.accountCode,
    required this.accountName,
    this.description,
    required this.accountType,
    required this.isActive,
    required this.isSystemAccount,
    this.parentAccountId,
  });

  factory AccountDto.fromJson(Map<String, dynamic> json) {
    return AccountDto(
      id: json['id'] as String,
      accountCode: json['accountCode'] as String,
      accountName: json['accountName'] as String,
      description: json['description'] as String?,
      accountType: json['accountType'] as String,
      isActive: json['isActive'] as bool? ?? true,
      isSystemAccount: json['isSystemAccount'] as bool? ?? false,
      parentAccountId: json['parentAccountId'] as String?,
    );
  }
}

class CreateAccountRequestDto {
  final String accountCode;
  final String accountName;
  final String? description;
  final String accountType;
  final String? parentAccountId;

  CreateAccountRequestDto({
    required this.accountCode,
    required this.accountName,
    this.description,
    required this.accountType,
    this.parentAccountId,
  });

  Map<String, dynamic> toJson() {
    return {
      'accountCode': accountCode,
      'accountName': accountName,
      if (description != null) 'description': description,
      'accountType': accountType,
      if (parentAccountId != null) 'parentAccountId': parentAccountId,
    };
  }
}

class UpdateAccountRequestDto {
  final String accountName;
  final String? description;
  final bool isActive;
  final String? parentAccountId;

  UpdateAccountRequestDto({
    required this.accountName,
    this.description,
    required this.isActive,
    this.parentAccountId,
  });

  Map<String, dynamic> toJson() {
    return {
      'accountName': accountName,
      if (description != null) 'description': description,
      'isActive': isActive,
      if (parentAccountId != null) 'parentAccountId': parentAccountId,
    };
  }
}
