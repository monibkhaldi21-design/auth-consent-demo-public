import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Checkbox,
  Text,
  Card,
  Divider,
  Snackbar,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as crypto from 'expo-crypto';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.100:3000/receive');
  const [consent, setConsent] = useState(false);
  const [consentTime, setConsentTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const [hashPassword, setHashPassword] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleConsent = () => {
    if (!consent) {
      setConsent(true);
      const now = new Date().toISOString();
      setConsentTime(now);
      showMessage('✅ تمت الموافقة بنجاح');
    } else {
      setConsent(false);
      setConsentTime(null);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setVisible(true);
  };

  const sha256Hash = async (text) => {
    const digest = await crypto.digest(crypto.CryptoDigestAlgorithm.SHA256, text);
    return digest;
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: ['image/*', 'application/pdf', 'text/plain'],
      });

      if (result.type === 'success') {
        setSelectedFiles([...selectedFiles, ...result.assets]);
        showMessage(`✅ تم اختيار ${result.assets.length} ملف(ملفات)`);
      }
    } catch (err) {
      showMessage('❌ خطأ في اختيار الملفات');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const validateInputs = () => {
    if (!email) {
      showMessage('❌ أدخل البريد الإلكتروني');
      return false;
    }
    if (!password || password.length < 4) {
      showMessage('❌ أدخل كلمة مرور بطول 4 أحرف على الأقل');
      return false;
    }
    if (!consent) {
      showMessage('❌ يجب الموافقة على نقل البيانات');
      return false;
    }
    if (!serverUrl) {
      showMessage('❌ أدخل عنوان السيرفر');
      return false;
    }
    return true;
  };

  const sendData = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      let passwordValue = password;
      if (hashPassword) {
        passwordValue = await sha256Hash(password);
      }

      const payload = {
        email,
        password: passwordValue,
        consent: true,
        consent_at: consentTime,
        consent_text: 'تمت الموافقة عبر تطبيق Android',
        hashed: hashPassword,
      };

      const response = await axios.post(serverUrl, payload, {
        timeout: 10000,
      });

      showMessage('✅ تم إرسال البيانات بنجاح');
      await AsyncStorage.setItem('lastData', JSON.stringify(payload));
      
      // مسح الحقول
      setEmail('');
      setPassword('');
      setConsent(false);
      setConsentTime(null);
      setSelectedFiles([]);
      setHashPassword(false);
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      showMessage(`❌ خطأ: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async () => {
    if (!consent || selectedFiles.length === 0) {
      showMessage('❌ اختر ملفات وافق على الموافقة');
      return;
    }

    if (!email) {
      showMessage('❌ أدخل البريد الإلكتروني');
      return;
    }

    setLoading(true);
    try {
      const uploadUrl = serverUrl.replace('/receive', '/upload');
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append('files', {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name,
        });
      });

      formData.append('email', email);
      formData.append('consent', 'true');
      formData.append('consent_at', consentTime);

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      showMessage(`✅ تم رفع ${response.data.saved} ملف(ملفات) بنجاح`);
      setSelectedFiles([]);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      showMessage(`❌ خطأ الرفع: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* الرأس */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 تطبيق جمع البيانات</Text>
        <Text style={styles.headerSubtitle}>بموافقة صريحة من المستخدم</Text>
      </View>

      {/* البيانات الأساسية */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>📝 البيانات الأساسية</Text>
          <Divider style={styles.divider} />

          <TextInput
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
            disabled={loading}
            placeholderTextColor="#999"
          />

          <TextInput
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            disabled={loading}
            placeholderTextColor="#999"
          />

          <TextInput
            label="عنوان السيرفر"
            value={serverUrl}
            onChangeText={setServerUrl}
            mode="outlined"
            style={styles.input}
            disabled={loading}
            placeholderTextColor="#999"
          />
        </Card.Content>
      </Card>

      {/* الخيارات */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>⚙️ الخيارات</Text>
          <Divider style={styles.divider} />

          <View style={styles.checkboxRow}>
            <Checkbox
              status={hashPassword ? 'checked' : 'unchecked'}
              onPress={() => setHashPassword(!hashPassword)}
              disabled={loading}
              color="#6200ee"
            />
            <Text style={styles.checkboxLabel}>تشفير كلمة المرور (SHA-256)</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Checkbox
              status={consent ? 'checked' : 'unchecked'}
              onPress={handleConsent}
              disabled={loading}
              color="#00aa00"
            />
            <Text style={styles.checkboxLabel}>✅ أوافق على نقل بياناتي</Text>
          </View>

          {consentTime && (
            <Card style={styles.consentCard}>
              <Card.Content>
                <Text style={styles.consentText}>
                  ✅ تمت الموافقة في:\n{new Date(consentTime).toLocaleString('ar')}
                </Text>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>

      {/* الملفات */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>📁 الملفات</Text>
          <Divider style={styles.divider} />

          {selectedFiles.length > 0 ? (
            selectedFiles.map((file, idx) => (
              <View key={idx} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>📄 {file.name}</Text>
                  <Text style={styles.fileSize}>
                    {(file.size / 1024).toFixed(2)} KB
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  onPress={() => removeFile(idx)}
                  labelStyle={styles.removeButtonLabel}
                >
                  حذف
                </Button>
              </View>
            ))
          ) : (
            <Text style={styles.noFiles}>❌ لم يتم اختيار ملفات</Text>
          )}

          <Button
            mode="outlined"
            onPress={pickFiles}
            disabled={loading}
            style={styles.button}
            icon="folder"
          >
            اختر الملفات
          </Button>
        </Card.Content>
      </Card>

      {/* أزرار الإرسال */}
      <View style={styles.buttonGroup}>
        <Button
          mode="contained"
          onPress={sendData}
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.sendButton]}
          labelStyle={styles.buttonLabel}
          icon="send"
        >
          إرسال البيانات
        </Button>

        <Button
          mode="contained"
          onPress={uploadFiles}
          loading={loading}
          disabled={loading || selectedFiles.length === 0}
          style={[styles.button, styles.uploadButton]}
          labelStyle={styles.buttonLabel}
          icon="upload"
        >
          رفع الملفات
        </Button>
      </View>

      {/* الإشعارات */}
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f0f0f0',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  headerSubtitle: {
    color: '#ddd',
    marginTop: 4,
    fontSize: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    marginVertical: 10,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  consentCard: {
    marginTop: 12,
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#00aa00',
  },
  consentText: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginVertical: 4,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6200ee',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontWeight: '600',
    fontSize: 13,
    color: '#333',
  },
  fileSize: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  noFiles: {
    color: '#999',
    fontSize: 12,
    marginVertical: 8,
    textAlign: 'center',
  },
  removeButtonLabel: {
    fontSize: 11,
  },
  buttonGroup: {
    marginBottom: 24,
  },
  button: {
    marginVertical: 8,
  },
  sendButton: {
    backgroundColor: '#6200ee',
  },
  uploadButton: {
    backgroundColor: '#ff9800',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: '#333',
  },
});
