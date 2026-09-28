import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/accounting_providers.dart';
import '../data/sacco_expense_dto.dart';
import 'record_expense_screen.dart';

class SaccoExpensesScreen extends ConsumerWidget {
  const SaccoExpensesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expensesAsync = ref.watch(saccoExpensesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Operating Expenses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(saccoExpensesProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const RecordExpenseScreen()),
          );
          if (result == true) {
            ref.invalidate(saccoExpensesProvider);
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('Record'),
      ),
      body: expensesAsync.when(
        data: (expenses) {
          if (expenses.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'No expenses recorded yet',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.grey.shade600),
                  ),
                ],
              ),
            );
          }
          
          return ListView.builder(
            padding: const EdgeInsets.only(top: 8, bottom: 80, left: 8, right: 8),
            itemCount: expenses.length,
            itemBuilder: (context, index) {
              final expense = expenses[index];
              final date = DateTime.tryParse(expense.expenseDate) ?? DateTime.now();
              final formatter = NumberFormat.currency(symbol: 'KES ');
              
              return Card(
                elevation: 1,
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              expense.narration,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ),
                          Text(
                            formatter.format(expense.amount),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Text(
                            DateFormat('MMM d, yyyy').format(date.toLocal()),
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                          ),
                          const Spacer(),
                          Text(
                            'GL: ${expense.glAccountCode}',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      if (expense.reference != null || expense.journalReference != null) ...[
                        const SizedBox(height: 8),
                        const Divider(),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            if (expense.journalReference != null)
                              Text(
                                'JRN: ${expense.journalReference}',
                                style: const TextStyle(color: Colors.teal, fontSize: 12, fontWeight: FontWeight.w500),
                              ),
                            if (expense.reference != null)
                              Text(
                                'REF: ${expense.reference}',
                                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                              ),
                          ],
                        ),
                      ]
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 48),
                const SizedBox(height: 16),
                Text('Failed to load expenses:\n$err', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(saccoExpensesProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
