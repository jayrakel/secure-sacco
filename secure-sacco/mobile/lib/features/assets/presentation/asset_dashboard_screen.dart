import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'asset_list_screen.dart';
import 'create_asset_screen.dart';
import '../data/asset_providers.dart';
import '../data/asset_dto.dart';
import '../../admin/presentation/widgets/admin_drawer.dart';

final _currencyFormat = NumberFormat.currency(symbol: 'KES ');

class AssetDashboardScreen extends ConsumerWidget {
  const AssetDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final assetsAsync = ref.watch(assetsProvider(null));

    return Scaffold(
      backgroundColor: colorScheme.surface,
      drawer: const AdminDrawer(),
      appBar: AppBar(
        title: const Text('Assets Management'),
        centerTitle: true,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(assetsProvider(null)),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          children: [
            _buildSectionHeader(context, 'Summary'),
            assetsAsync.when(
              data: (assets) => _buildKpiGrid(context, assets),
              loading: () => const Center(child: Padding(
                padding: EdgeInsets.all(32.0),
                child: CircularProgressIndicator(),
              )),
              error: (err, _) => Center(child: Text('Error: $err')),
            ),
            const SizedBox(height: 24),
            _buildSectionHeader(context, 'Core Operations'),
            _buildActionCard(
              context: context,
              title: 'Asset Register',
              subtitle: 'View and manage all organization assets',
              icon: Icons.inventory_2,
              color: Colors.blue,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AssetListScreen())),
            ),
            _buildActionCard(
              context: context,
              title: 'Acquire New Asset',
              subtitle: 'Register newly purchased or acquired assets',
              icon: Icons.add_shopping_cart,
              color: Colors.green,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateAssetScreen())),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiGrid(BuildContext context, List<AssetResponse> assets) {
    final active = assets.where((a) => a.status == AssetStatus.ACTIVE).length;
    final disposed = assets.where((a) => a.status.isTerminal).length;
    final totalValue = assets
        .where((a) => !a.status.isTerminal)
        .fold(0.0, (sum, a) => sum + a.purchaseCost);

    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      children: [
        _buildKpiCard(context, 'Total Assets', assets.length.toString(), Colors.blue),
        _buildKpiCard(context, 'Book Value', _currencyFormat.format(totalValue), Colors.teal),
        _buildKpiCard(context, 'Active', active.toString(), Colors.green),
        _buildKpiCard(context, 'Disposed/WO', disposed.toString(), Colors.red),
      ],
    );
  }

  Widget _buildKpiCard(BuildContext context, String label, String value, Color color) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label.toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade500,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 12),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
      ),
    );
  }

  Widget _buildActionCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
