import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/accounting_providers.dart';
import 'post_journal_entry_screen.dart';

final _currency = NumberFormat.currency(symbol: 'KES ');

class JournalEntriesScreen extends ConsumerWidget {
  const JournalEntriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final journalsAsync = ref.watch(journalEntriesProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Journal Entries'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(journalEntriesProvider),
          ),
        ],
      ),
      body: journalsAsync.when(
        data: (journals) {
          if (journals.isEmpty) {
            return _buildEmptyState(context);
          }
          return ListView.builder(
            padding: const EdgeInsets.only(bottom: 80, top: 16),
            itemCount: journals.length,
            itemBuilder: (context, index) {
              final journal = journals[index];
              final isPosted = journal.status == 'POSTED';
              
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: ExpansionTile(
                    shape: const Border(),
                    title: Text(
                      journal.referenceNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        '${journal.transactionDate} | ${journal.description}',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isPosted ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        journal.status,
                        style: TextStyle(
                          color: isPosted ? Colors.green.shade700 : Colors.orange.shade700,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    children: [
                      Container(
                        color: Colors.grey.shade50,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: journal.lines.map((line) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    flex: 2,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(line.accountName ?? line.accountCode, style: const TextStyle(fontWeight: FontWeight.w600)),
                                        if (line.memberId != null)
                                          Text('Member: ${line.memberId}', style: TextStyle(fontSize: 12, color: Colors.indigo.shade400)),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('Dr', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                                        Text(_currency.format(line.debitAmount), style: const TextStyle(fontWeight: FontWeight.w500)),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('Cr', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                                        Text(_currency.format(line.creditAmount), style: const TextStyle(fontWeight: FontWeight.w500)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      )
                    ],
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
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const PostJournalEntryScreen()),
          ).then((_) {
            ref.invalidate(journalEntriesProvider);
          });
        },
        label: const Text('Post Entry'),
        icon: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.menu_book, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No journal entries found.',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }
}
