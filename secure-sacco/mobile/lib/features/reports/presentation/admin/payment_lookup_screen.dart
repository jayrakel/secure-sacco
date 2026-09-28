import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../data/report_dto.dart';
import '../../data/report_providers.dart';

class PaymentLookupScreen extends ConsumerStatefulWidget {
  const PaymentLookupScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PaymentLookupScreen> createState() => _PaymentLookupScreenState();
}

class _PaymentLookupScreenState extends ConsumerState<PaymentLookupScreen> {
  final _searchController = TextEditingController();
  PaymentRouteLookupResponse? _result;
  bool _isLoading = false;
  String? _error;

  Future<void> _search() async {
    final reference = _searchController.text.trim();
    if (reference.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
      _result = null;
    });

    try {
      final repository = ref.read(reportRepositoryProvider);
      final result = await repository.lookupPayment(reference);
      
      if (mounted) {
        setState(() {
          _result = result;
          if (result == null) {
            _error = 'No payment found for reference "$reference"';
          }
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _error = 'API Error: ${e.response?.statusCode} ${e.message}';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Route Lookup'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'M-Pesa or Internal Reference',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.search),
                    ),
                    onSubmitted: (_) => _search(),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : _search,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16.0),
                    child: Text('Search'),
                  ),
                ),
              ],
            ),
          ),
          if (_isLoading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(child: Center(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 16))))
          else if (_result != null)
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSummaryCard(_result!),
                    const SizedBox(height: 24),
                    const Text('Routing Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    _buildRoutingTimeline(_result!.routes),
                  ],
                ),
              ),
            )
          else
            const Expanded(
              child: Center(
                child: Text('Enter a reference to trace how the payment was routed.', style: TextStyle(color: Colors.grey)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(PaymentRouteLookupResponse data) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Amount:', style: TextStyle(fontSize: 16, color: Colors.grey)),
                Text('KES ${data.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue)),
              ],
            ),
            const Divider(height: 32),
            _buildDetailRow('Status', data.paymentStatus, isStatus: true),
            _buildDetailRow('M-Pesa Ref', data.mpesaRef ?? 'N/A'),
            _buildDetailRow('Internal Ref', data.internalRef ?? 'N/A'),
            _buildDetailRow('Date', data.createdAt),
            const Divider(height: 32),
            _buildDetailRow('Member', '${data.memberName} (${data.memberNumber ?? 'Guest'})'),
            _buildDetailRow('Sender Phone', data.senderPhoneNumber ?? 'N/A'),
            if (data.isSplitDeposit) ...[
              const SizedBox(height: 8),
              const Chip(label: Text('Split Deposit'), backgroundColor: Colors.orange, labelStyle: TextStyle(color: Colors.white)),
            ],
            if (data.failureReason != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(8),
                color: Colors.red.shade50,
                child: Text('Error: ${data.failureReason}', style: const TextStyle(color: Colors.red)),
              ),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isStatus = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: isStatus 
                  ? (value == 'COMPLETED' ? Colors.green : (value == 'FAILED' ? Colors.red : Colors.orange))
                  : Colors.black87,
                fontWeight: isStatus ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoutingTimeline(List<RouteItem> routes) {
    if (routes.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Text('No routing information available. The payment may have failed before routing or is still pending.'),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: routes.length,
      itemBuilder: (context, index) {
        final route = routes[index];
        final isSuccess = route.status == 'ROUTED';
        final isFailed = route.status == 'FAILED';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isSuccess ? Colors.green.shade100 : (isFailed ? Colors.red.shade100 : Colors.orange.shade100),
              child: Icon(
                isSuccess ? Icons.check : (isFailed ? Icons.error : Icons.pending),
                color: isSuccess ? Colors.green : (isFailed ? Colors.red : Colors.orange),
              ),
            ),
            title: Text('${route.moduleType} - ${route.productName}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('KES ${route.amount.toStringAsFixed(2)}'),
                if (isFailed && route.failureReason != null)
                  Text(route.failureReason!, style: const TextStyle(color: Colors.red, fontSize: 12)),
              ],
            ),
            trailing: Text(route.status, style: TextStyle(
              color: isSuccess ? Colors.green : (isFailed ? Colors.red : Colors.orange),
              fontWeight: FontWeight.bold,
            )),
          ),
        );
      },
    );
  }
}
