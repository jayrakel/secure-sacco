import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/accounting_providers.dart';
import '../data/reconciliation_dto.dart';

final _currency = NumberFormat.currency(symbol: 'KES ');

class ReconciliationScreen extends ConsumerWidget {
  const ReconciliationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(internalReconciliationProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Internal Reconciliation'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(internalReconciliationProvider),
          ),
        ],
      ),
      body: asyncData.when(
        data: (data) {
          final time = DateTime.tryParse(data.timestamp) ?? DateTime.now();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                elevation: 0,
                color: Colors.indigo.shade50,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.indigo.shade400),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Last Reconciled', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text(DateFormat('MMM d, yyyy - HH:mm a').format(time.toLocal()), style: TextStyle(color: Colors.indigo.shade700)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _buildSection(context, 'Savings Reconciliation', data.savingsReconciliation, Colors.blue),
              _buildSection(context, 'Share Reconciliation', data.shareReconciliation, Colors.purple),
              _buildSection(context, 'Loan Reconciliation', data.loanReconciliation, Colors.orange),
              const SizedBox(height: 32),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<ReconciliationLineDto> lines, Color themeColor) {
    if (lines.isEmpty) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            decoration: BoxDecoration(
              color: themeColor.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(Icons.account_balance, color: themeColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  title.toUpperCase(),
                  style: TextStyle(fontWeight: FontWeight.bold, color: themeColor),
                ),
              ],
            ),
          ),
          ...lines.map((line) {
            return ExpansionTile(
              shape: const Border(),
              leading: Icon(
                line.isReconciled ? Icons.check_circle : Icons.warning,
                color: line.isReconciled ? Colors.green : Colors.red,
              ),
              title: Text(line.productName, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                line.isReconciled ? 'Reconciled' : 'Variance: ${_currency.format(line.variance)}',
                style: TextStyle(color: line.isReconciled ? Colors.green : Colors.red, fontSize: 13),
              ),
              children: [
                Container(
                  color: Colors.grey.shade50,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('GL Account', style: TextStyle(color: Colors.grey)),
                          Text('${line.glAccountCode} - ${line.glAccountName}', style: const TextStyle(fontWeight: FontWeight.w500)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Sub-Ledger Balance', style: TextStyle(color: Colors.grey)),
                          Text(_currency.format(line.subLedgerBalance), style: const TextStyle(fontWeight: FontWeight.w500)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('GL Balance', style: TextStyle(color: Colors.grey)),
                          Text(_currency.format(line.glBalance), style: const TextStyle(fontWeight: FontWeight.w500)),
                        ],
                      ),
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Variance', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text(
                            _currency.format(line.variance),
                            style: TextStyle(
                              color: line.variance == 0 ? Colors.green : Colors.red,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              ],
            );
          }),
        ],
      ),
    );
  }
}
