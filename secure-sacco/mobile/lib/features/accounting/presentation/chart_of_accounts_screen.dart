import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/accounting_providers.dart';
import '../data/account_dto.dart';
import 'create_account_screen.dart';

class ChartOfAccountsScreen extends ConsumerWidget {
  const ChartOfAccountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accountsAsync = ref.watch(accountsProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Chart of Accounts'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(accountsProvider),
          ),
        ],
      ),
      body: accountsAsync.when(
        data: (accounts) {
          if (accounts.isEmpty) {
            return _buildEmptyState(context);
          }
          
          // Group accounts by type
          final grouped = <String, List<AccountDto>>{};
          for (final a in accounts) {
            grouped.putIfAbsent(a.accountType, () => []).add(a);
          }
          
          final order = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
          final sortedKeys = grouped.keys.toList()..sort((a, b) {
            final idxA = order.indexOf(a);
            final idxB = order.indexOf(b);
            return (idxA != -1 ? idxA : 99).compareTo(idxB != -1 ? idxB : 99);
          });

          return ListView.builder(
            padding: const EdgeInsets.only(bottom: 80, top: 16),
            itemCount: sortedKeys.length,
            itemBuilder: (context, index) {
              final type = sortedKeys[index];
              final list = grouped[type]!..sort((a, b) => a.accountCode.compareTo(b.accountCode));
              
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: ExpansionTile(
                    initiallyExpanded: index == 0,
                    shape: const Border(), // Removes internal borders
                    title: Text(
                      type,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    subtitle: Text('${list.length} Accounts', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    leading: CircleAvatar(
                      backgroundColor: _getColorForType(type).withOpacity(0.1),
                      child: Icon(_getIconForType(type), color: _getColorForType(type)),
                    ),
                    children: list.map((account) => _buildAccountItem(account)).toList(),
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateAccountScreen()),
          );
          if (res == true) {
            ref.invalidate(accountsProvider);
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('New Account'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.account_tree, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No accounts found.',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountItem(AccountDto account) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      title: Row(
        children: [
          Text(
            account.accountCode,
            style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, color: Colors.teal),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              account.accountName,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
      subtitle: account.description?.isNotEmpty == true
          ? Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(account.description!),
            )
          : null,
      trailing: account.isActive
          ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
          : const Icon(Icons.cancel, color: Colors.red, size: 20),
    );
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'ASSET': return Colors.blue;
      case 'LIABILITY': return Colors.orange;
      case 'EQUITY': return Colors.purple;
      case 'REVENUE': return Colors.green;
      case 'EXPENSE': return Colors.red;
      default: return Colors.grey;
    }
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'ASSET': return Icons.account_balance;
      case 'LIABILITY': return Icons.money_off;
      case 'EQUITY': return Icons.pie_chart;
      case 'REVENUE': return Icons.trending_up;
      case 'EXPENSE': return Icons.trending_down;
      default: return Icons.folder;
    }
  }
}
