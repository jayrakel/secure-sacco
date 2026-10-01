enum AssetCategory {
  FURNITURE,
  EQUIPMENT,
  COMPUTER,
  VEHICLE,
  OTHER,
}

enum AssetStatus {
  ACTIVE,
  UNDER_MAINTENANCE,
  DISPOSED,
  WRITTEN_OFF,
}

extension AssetStatusExtension on AssetStatus {
  bool get isTerminal => this == AssetStatus.DISPOSED || this == AssetStatus.WRITTEN_OFF;
}

class RegisterAssetRequest {
  final String assetName;
  final String category;
  final String purchaseDate;
  final double purchaseCost;
  final String? serialNumber;
  final String? description;
  final String? location;
  final String? supplier;
  final String? warrantyExpiry;

  RegisterAssetRequest({
    required this.assetName,
    required this.category,
    required this.purchaseDate,
    required this.purchaseCost,
    this.serialNumber,
    this.description,
    this.location,
    this.supplier,
    this.warrantyExpiry,
  });

  Map<String, dynamic> toJson() {
    return {
      'assetName': assetName,
      'category': category,
      'purchaseDate': purchaseDate,
      'purchaseCost': purchaseCost,
      if (serialNumber != null) 'serialNumber': serialNumber,
      if (description != null) 'description': description,
      if (location != null) 'location': location,
      if (supplier != null) 'supplier': supplier,
      if (warrantyExpiry != null) 'warrantyExpiry': warrantyExpiry,
    };
  }
}

class UpdateAssetStatusRequest {
  final String newStatus;
  final String? disposalNotes;
  final double? disposalValue;

  UpdateAssetStatusRequest({
    required this.newStatus,
    this.disposalNotes,
    this.disposalValue,
  });

  Map<String, dynamic> toJson() {
    return {
      'newStatus': newStatus,
      if (disposalNotes != null) 'disposalNotes': disposalNotes,
      if (disposalValue != null) 'disposalValue': disposalValue,
    };
  }
}

class UpdateAssetRequest {
  final String assetName;
  final String? serialNumber;
  final String? description;
  final String? location;
  final String? supplier;
  final String? warrantyExpiry;

  UpdateAssetRequest({
    required this.assetName,
    this.serialNumber,
    this.description,
    this.location,
    this.supplier,
    this.warrantyExpiry,
  });

  Map<String, dynamic> toJson() {
    return {
      'assetName': assetName,
      if (serialNumber != null) 'serialNumber': serialNumber,
      if (description != null) 'description': description,
      if (location != null) 'location': location,
      if (supplier != null) 'supplier': supplier,
      if (warrantyExpiry != null) 'warrantyExpiry': warrantyExpiry,
    };
  }
}

class AssetResponse {
  final String id;
  final AssetCategory category;
  final AssetStatus status;
  final String assetName;
  final String? serialNumber;
  final String? description;
  final DateTime purchaseDate;
  final double purchaseCost;
  final String glAccountCode;
  final String? journalReference;
  final String? location;
  final String? supplier;
  final DateTime? warrantyExpiry;
  final DateTime? disposedAt;
  final String? disposalNotes;
  final double? disposalValue;
  final double? profitOrLoss;
  final String createdByUserId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  AssetResponse({
    required this.id,
    required this.category,
    required this.status,
    required this.assetName,
    this.serialNumber,
    this.description,
    required this.purchaseDate,
    required this.purchaseCost,
    required this.glAccountCode,
    this.journalReference,
    this.location,
    this.supplier,
    this.warrantyExpiry,
    this.disposedAt,
    this.disposalNotes,
    this.disposalValue,
    this.profitOrLoss,
    required this.createdByUserId,
    this.createdAt,
    this.updatedAt,
  });

  factory AssetResponse.fromJson(Map<String, dynamic> json) {
    return AssetResponse(
      id: json['id'],
      category: AssetCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => AssetCategory.OTHER,
      ),
      status: AssetStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AssetStatus.ACTIVE,
      ),
      assetName: json['assetName'],
      serialNumber: json['serialNumber'],
      description: json['description'],
      purchaseDate: DateTime.parse(json['purchaseDate']),
      purchaseCost: (json['purchaseCost'] as num).toDouble(),
      glAccountCode: json['glAccountCode'],
      journalReference: json['journalReference'],
      location: json['location'],
      supplier: json['supplier'],
      warrantyExpiry: json['warrantyExpiry'] != null ? DateTime.parse(json['warrantyExpiry']) : null,
      disposedAt: json['disposedAt'] != null ? DateTime.parse(json['disposedAt']) : null,
      disposalNotes: json['disposalNotes'],
      disposalValue: json['disposalValue'] != null ? (json['disposalValue'] as num).toDouble() : null,
      profitOrLoss: json['profitOrLoss'] != null ? (json['profitOrLoss'] as num).toDouble() : null,
      createdByUserId: json['createdByUserId'],
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }
}
