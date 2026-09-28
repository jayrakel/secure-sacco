import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/report_providers.dart';

class MySummaryScreen extends ConsumerWidget {
  const MySummaryScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(mySummaryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Financial Summary'),
      ),
      body: summaryAsync.when(
        data: (summary) {
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                _buildSummaryCard(
                  title: 'Savings Balance',
                  value: summary.savingsBalance,
                  icon: Icons.savings,
                  color: Colors.green,
                ),
                const SizedBox(height: 16),
                _buildSummaryCard(
                  title: 'Loan Arrears',
                  value: summary.loanArrears,
                  icon: Icons.warning,
                  color: summary.loanArrears > 0 ? Colors.red : Colors.grey,
                ),
                const SizedBox(height: 16),
                _buildSummaryCard(
                  title: 'Penalty Outstanding',
                  value: summary.penaltyOutstanding,
                  icon: Icons.gavel,
                  color: summary.penaltyOutstanding > 0 ? Colors.orange : Colors.grey,
                ),
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  child: ListTile(
                    leading: const Icon(Icons.info, color: Colors.blue),
                    title: const Text('Active Loan Status'),
                    subtitle: Text(
                      summary.activeLoanStatus.isNotEmpty ? summary.activeLoanStatus : 'No Active Loan',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                if (summary.nextDueDate != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    elevation: 2,
                    child: ListTile(
                      leading: const Icon(Icons.calendar_today, color: Colors.blue),
                      title: const Text('Next Due Date'),
                      subtitle: Text(
                        summary.nextDueDate!,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required double value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.2),
              radius: 30,
              child: Icon(icon, color: color, size: 30),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'KES ${value.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
