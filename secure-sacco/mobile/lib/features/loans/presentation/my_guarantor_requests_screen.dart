import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/loan_dto.dart';
import '../data/loan_providers.dart';

class MyGuarantorRequestsScreen extends ConsumerStatefulWidget {
  const MyGuarantorRequestsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MyGuarantorRequestsScreen> createState() => _MyGuarantorRequestsScreenState();
}

class _MyGuarantorRequestsScreenState extends ConsumerState<MyGuarantorRequestsScreen> {
  final _currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

  Future<void> _respond(String applicationId, String guarantorId, String status) async {
    try {
      final repo = ref.read(loanRepositoryProvider);
      await repo.respondToGuarantorRequest(applicationId, guarantorId, status);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Request ${status.toLowerCase()} successfully')),
      );
      ref.invalidate(myGuarantorRequestsProvider);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to respond: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final requestsAsyncValue = ref.watch(myGuarantorRequestsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guarantor Requests'),
      ),
      body: requestsAsyncValue.when(
        data: (requests) {
          if (requests.isEmpty) {
            return _buildEmptyState();
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(myGuarantorRequestsProvider);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: requests.length,
              itemBuilder: (context, index) {
                return _buildRequestCard(requests[index]);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error loading requests: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(myGuarantorRequestsProvider);
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.handshake_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'No Guarantor Requests',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800]),
          ),
          const SizedBox(height: 8),
          Text(
            'You do not have any pending requests\nto guarantee a loan.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestCard(MyGuarantorRequestResponse request) {
    final isPending = request.status == 'PENDING';
    final requestDate = DateTime.tryParse(request.requestDate);
    final formattedDate = requestDate != null ? DateFormat.yMMMd().format(requestDate) : request.requestDate;

    Color statusColor;
    switch (request.status) {
      case 'ACCEPTED':
        statusColor = Colors.green;
        break;
      case 'REJECTED':
        statusColor = Colors.red;
        break;
      default:
        statusColor = Colors.orange;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  formattedDate,
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    request.status,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Applicant: ${request.applicantName}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Loan', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text(
                      _currencyFormat.format(request.loanAmount),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('Requested Guarantee', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text(
                      _currencyFormat.format(request.requestedAmount),
                      style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.blue),
                    ),
                  ],
                ),
              ],
            ),
            if (isPending) ...[
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => _respond(request.loanApplicationId, request.id, 'REJECTED'),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    child: const Text('Reject'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () => _respond(request.loanApplicationId, request.id, 'ACCEPTED'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Accept Request'),
                  ),
                ],
              ),
            ]
          ],
        ),
      ),
    );
  }
}
