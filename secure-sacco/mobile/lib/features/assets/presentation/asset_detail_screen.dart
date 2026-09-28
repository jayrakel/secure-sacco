import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/asset_dto.dart';
import '../data/asset_providers.dart';
import 'update_asset_screen.dart';
import 'widgets/change_asset_status_dialog.dart';

final _currencyFormat = NumberFormat.currency(symbol: 'KES ');

class AssetDetailScreen extends ConsumerWidget {
  final String assetId;

  const AssetDetailScreen({super.key, required this.assetId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assetAsync = ref.watch(assetDetailProvider(assetId));
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: const Text('Asset Details'),
        elevation: 0,
        actions: [
          assetAsync.maybeWhen(
            data: (asset) => !asset.status.isTerminal
                ? PopupMenuButton<String>(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onSelected: (value) {
                      if (value == 'edit') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => UpdateAssetScreen(asset: asset),
                          ),
                        ).then((_) => ref.invalidate(assetDetailProvider(assetId)));
                      } else if (value == 'status') {
                        showDialog(
                          context: context,
                          builder: (_) => ChangeAssetStatusDialog(asset: asset),
                        ).then((_) => ref.invalidate(assetDetailProvider(assetId)));
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 20),
                            SizedBox(width: 8),
                            Text('Edit Details'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'status',
                        child: Row(
                          children: [
                            Icon(Icons.swap_horiz, size: 20),
                            SizedBox(width: 8),
                            Text('Change Status'),
                          ],
                        ),
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          )
        ],
      ),
      body: assetAsync.when(
        data: (asset) => _buildContent(context, asset),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, AssetResponse asset) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeaderCard(context, asset),
          const SizedBox(height: 16),
          _buildFinancialCard(context, asset),
          const SizedBox(height: 16),
          _buildDetailsCard(context, asset),
          if (asset.status.isTerminal) ...[
            const SizedBox(height: 16),
            _buildDisposalCard(context, asset),
          ]
        ],
      ),
    );
  }

  Widget _buildHeaderCard(BuildContext context, AssetResponse asset) {
    Color statusColor;
    switch (asset.status) {
      case AssetStatus.ACTIVE:
        statusColor = Colors.green;
        break;
      case AssetStatus.UNDER_MAINTENANCE:
        statusColor = Colors.orange;
        break;
      case AssetStatus.DISPOSED:
        statusColor = Colors.blueGrey;
        break;
      case AssetStatus.WRITTEN_OFF:
        statusColor = Colors.red;
        break;
    }

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        asset.assetName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'ID: ${asset.id.split('-').first}', 
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    asset.status.name.replaceAll('_', ' '),
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            if (asset.description != null && asset.description!.isNotEmpty) ...[
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  asset.description!,
                  style: TextStyle(color: Colors.grey.shade800, height: 1.4),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialCard(BuildContext context, AssetResponse asset) {
    return _buildInfoCard(
      context: context,
      title: 'Financials',
      icon: Icons.account_balance_wallet,
      iconColor: Colors.teal,
      children: [
        _buildRow('Purchase Cost', _currencyFormat.format(asset.purchaseCost)),
        _buildRow('Purchase Date', DateFormat('MMM d, yyyy').format(asset.purchaseDate.toLocal())),
        _buildRow('GL Account', asset.glAccountCode),
        if (asset.journalReference != null)
          _buildRow('Journal Ref', asset.journalReference!),
      ],
    );
  }

  Widget _buildDetailsCard(BuildContext context, AssetResponse asset) {
    return _buildInfoCard(
      context: context,
      title: 'Asset Information',
      icon: Icons.info,
      iconColor: Colors.blue,
      children: [
        _buildRow('Category', asset.category.name.replaceAll('_', ' ')),
        _buildRow('Location', asset.location ?? 'N/A'),
        _buildRow('Supplier', asset.supplier ?? 'N/A'),
        _buildRow('Serial Number', asset.serialNumber ?? 'N/A'),
        _buildRow('Warranty Expiry', asset.warrantyExpiry != null ? DateFormat('MMM d, yyyy').format(asset.warrantyExpiry!.toLocal()) : 'N/A'),
        _buildRow('Registered', asset.createdAt != null ? DateFormat('MMM d, yyyy HH:mm').format(asset.createdAt!.toLocal()) : 'N/A'),
      ],
    );
  }

  Widget _buildDisposalCard(BuildContext context, AssetResponse asset) {
    final bool isProfit = (asset.profitOrLoss ?? 0) > 0;
    
    return _buildInfoCard(
      context: context,
      title: 'Disposal Information',
      icon: Icons.delete_forever,
      iconColor: Colors.red,
      children: [
        _buildRow('Disposed At', asset.disposedAt != null ? DateFormat('MMM d, yyyy HH:mm').format(asset.disposedAt!.toLocal()) : 'N/A'),
        _buildRow('Disposal Value', asset.disposalValue != null ? _currencyFormat.format(asset.disposalValue) : 'N/A'),
        _buildRow(
          'Profit/Loss',
          asset.profitOrLoss != null ? _currencyFormat.format(asset.profitOrLoss) : 'N/A',
          valueColor: asset.profitOrLoss != null 
            ? (isProfit ? Colors.green : Colors.red)
            : null,
        ),
        if (asset.disposalNotes != null && asset.disposalNotes!.isNotEmpty) ...[
          const SizedBox(height: 12),
          const Text('Notes:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(asset.disposalNotes!, style: const TextStyle(height: 1.4)),
        ],
      ],
    );
  }

  Widget _buildInfoCard({
    required BuildContext context,
    required String title,
    required IconData icon,
    required Color iconColor,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: iconColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  title.toUpperCase(),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: iconColor,
                    letterSpacing: 1.2,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          Text(
            value, 
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
