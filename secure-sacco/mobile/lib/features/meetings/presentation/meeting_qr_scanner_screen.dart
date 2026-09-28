import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../data/meetings_providers.dart';

class MeetingQrScannerScreen extends ConsumerStatefulWidget {
  final String meetingId;

  const MeetingQrScannerScreen({super.key, required this.meetingId});

  @override
  ConsumerState<MeetingQrScannerScreen> createState() => _MeetingQrScannerScreenState();
}

class _MeetingQrScannerScreenState extends ConsumerState<MeetingQrScannerScreen> {
  bool _isProcessing = false;
  MobileScannerController cameraController = MobileScannerController();

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  Future<void> _handleScan(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final String? code = barcodes.first.rawValue;
      if (code != null) {
        setState(() {
          _isProcessing = true;
        });

        try {
          final repo = ref.read(meetingsRepositoryProvider);
          final result = await repo.scanAttendance(widget.meetingId, code);
          
          if (!mounted) return;
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully checked in! Status: ${result.status}'),
              backgroundColor: AppColors.positive,
            ),
          );
          
          ref.invalidate(myMeetingsProvider);
          context.pop(); // Go back to meetings list
          
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Check-in failed: ${e.toString()}'),
              backgroundColor: AppColors.negative,
            ),
          );
          // Allow trying again after 2 seconds
          Future.delayed(const Duration(seconds: 2), () {
            if (mounted) {
              setState(() {
                _isProcessing = false;
              });
            }
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Meeting QR'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: cameraController,
            onDetect: _handleScan,
          ),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Recording attendance...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
          if (!_isProcessing)
            Center(
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.primary, width: 4),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          if (!_isProcessing)
            const Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Text(
                'Position the QR code within the frame to check in',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  backgroundColor: Colors.black54,
                  fontSize: 14,
                ),
              ),
            )
        ],
      ),
    );
  }
}
