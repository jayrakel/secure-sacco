import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/report_providers.dart';

class DailyCollectionsScreen extends ConsumerStatefulWidget {
  const DailyCollectionsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<DailyCollectionsScreen> createState() => _DailyCollectionsScreenState();
}

class _DailyCollectionsScreenState extends ConsumerState<DailyCollectionsScreen> {
  DateTime _selectedDate = DateTime.now();

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = _selectedDate.toIso8601String().split('T')[0];
    
    final collectionAsync = ref.watch(dailyCollectionsProvider(dateStr));
    final linesAsync = ref.watch(dailyCollectionLinesProvider(dateStr));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Collections'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () => _selectDate(context),
          ),
        ],
      ),
      body: collectionAsync.when(
        data: (summary) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Card(
                  color: Colors.blue.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        const Text('Total Collected', style: TextStyle(fontSize: 16)),
                        const SizedBox(height: 8),
                        Text(
                          'KES ${summary.totalCollected.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.blue),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const Divider(thickness: 2),
              Expanded(
                child: linesAsync.when(
                  data: (lines) {
                    if (lines.isEmpty) {
                      return const Center(child: Text('No collections for this date.'));
                    }
                    return ListView.separated(
                      itemCount: lines.length,
                      separatorBuilder: (_, __) => const Divider(),
                      itemBuilder: (context, index) {
                        final line = lines[index];
                        return ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Colors.green,
                            child: Icon(Icons.check, color: Colors.white),
                          ),
                          title: Text(line.senderName ?? line.internalRef),
                          subtitle: Text('${line.paymentMethod} • ${line.mpesaRef ?? 'No Ref'}\nRef: ${line.accountReference ?? 'N/A'}'),
                          trailing: Text(
                            'KES ${line.amount.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          isThreeLine: true,
                        );
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => Center(child: Text('Error: $err')),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
