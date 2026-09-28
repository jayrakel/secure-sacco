import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AuthenticatedAvatar extends ConsumerStatefulWidget {
  final String? imageUrl;
  final String fallbackText;
  final double radius;
  final Color backgroundColor;
  final Color textColor;

  const AuthenticatedAvatar({
    Key? key,
    this.imageUrl,
    required this.fallbackText,
    this.radius = 20.0,
    this.backgroundColor = AppColors.primaryLight,
    this.textColor = AppColors.primary,
  }) : super(key: key);

  @override
  ConsumerState<AuthenticatedAvatar> createState() => _AuthenticatedAvatarState();
}

class _AuthenticatedAvatarState extends ConsumerState<AuthenticatedAvatar> {
  Uint8List? _imageBytes;
  bool _isLoading = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  @override
  void didUpdateWidget(AuthenticatedAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _loadImage();
    }
  }

  Future<void> _loadImage() async {
    print('AUTHENTICATED AVATAR FETCHING URL: ${widget.imageUrl}');

    if (widget.imageUrl == null || widget.imageUrl!.isEmpty) {
      if (mounted) setState(() { _imageBytes = null; _hasError = false; });
      return;
    }

    if (mounted) setState(() { _isLoading = true; _hasError = false; });

    try {
      final dio = ref.read(dioProvider);
      
      String targetUrl = widget.imageUrl!;
      if (targetUrl.startsWith('/')) {
        final baseUrl = dio.options.baseUrl;
        targetUrl = '$baseUrl$targetUrl';
      } else if (targetUrl.startsWith('http://localhost') || targetUrl.startsWith('http://127.0.0.1')) {
        final uri = Uri.parse(targetUrl);
        final baseUrl = dio.options.baseUrl;
        targetUrl = '$baseUrl${uri.path}';
        if (uri.query.isNotEmpty) {
          targetUrl += '?${uri.query}';
        }
      } else if (targetUrl.startsWith('http://') && targetUrl.contains('betterlink')) {
        targetUrl = targetUrl.replaceFirst('http://', 'https://');
      }

      print('AUTHENTICATED AVATAR FETCHING URL: $targetUrl');

      final response = await dio.get<List<int>>(
        targetUrl,
        options: Options(
          responseType: ResponseType.bytes,
        ),
      );

      if (mounted) {
        setState(() {
          _imageBytes = Uint8List.fromList(response.data!);
          _isLoading = false;
        });
      }
    } catch (e) {
      print('AUTHENTICATED AVATAR ERROR: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: widget.radius,
      backgroundColor: widget.backgroundColor,
      backgroundImage: _imageBytes != null && !_hasError ? MemoryImage(_imageBytes!) : null,
      child: _imageBytes == null || _hasError
          ? Text(
              widget.fallbackText.isNotEmpty ? widget.fallbackText[0].toUpperCase() : '?',
              style: AppTextStyles.bodyMedium.copyWith(
                color: widget.textColor,
                fontWeight: FontWeight.bold,
                fontSize: widget.radius * 0.8,
              ),
            )
          : null,
    );
  }
}
