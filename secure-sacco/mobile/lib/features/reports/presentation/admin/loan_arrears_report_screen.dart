import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/report_providers.dart';

class LoanArrearsReportScreen extends ConsumerWidget {
  const LoanArrearsReportScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final arrearsAsync = ref.watch(loanArrearsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Arrears Report'),
      ),
      body: arrearsAsync.when(
        data: (arrears) {
          if (arrears.isEmpty) {
            return const Center(child: Text('No loans in arrears!'));
          }

          final totalArrears = arrears.fold<double>(0, (sum, item) => sum + item.amountOverdue);

          return Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16.0),
                color: Colors.red.shade50,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Arrears:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(
                      'KES ${totalArrears.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.red),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.separated(
                  itemCount: arrears.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, index) {
                    final item = arrears[index];
                    return ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Colors.red,
                        child: Icon(Icons.warning, color: Colors.white),
                      ),
                      title: Text('${item.memberName} (${item.memberNumber})'),
                      subtitle: Text('${item.productName}\n${item.daysOverdue} days overdue (${item.bucket})'),
                      trailing: Text(
                        'KES ${item.amountOverdue.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 15),
                      ),
                      isThreeLine: true,
                    );
                  },
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
