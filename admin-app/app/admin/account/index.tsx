import { Ionicons } from "@expo/vector-icons";
import { FirebaseError } from "firebase/app";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile, type User } from "firebase/auth";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "@/src/config/firebase";

const NAVY="#082F5B", DARK="#052445", GOLD="#F3B53F", WHITE="#FFFFFF", BORDER="#E2E8F0", MUTED="#64748B", GREEN="#159A6A", RED="#DC2626";

function messageFor(error: unknown) {
  if (!(error instanceof FirebaseError)) return "Unable to update account. Please try again.";
  switch (error.code) {
    case "auth/wrong-password": case "auth/invalid-credential": return "Current password is incorrect.";
    case "auth/email-already-in-use": return "This email is already being used.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "New password must be at least 6 characters.";
    case "auth/requires-recent-login": return "Please sign in again and retry.";
    case "auth/too-many-requests": return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed": return "Network problem. Check your connection.";
    default: return error.message || "Unable to update account.";
  }
}

export default function AdminAccountScreen() {
  const router=useRouter();
  const [user,setUser]=useState<User|null>(auth.currentUser), [checking,setChecking]=useState(true);
  const [name,setName]=useState(""), [email,setEmail]=useState("");
  const [current,setCurrent]=useState(""), [next,setNext]=useState(""), [confirm,setConfirm]=useState("");
  const [showCurrent,setShowCurrent]=useState(false), [showNext,setShowNext]=useState(false), [showConfirm,setShowConfirm]=useState(false);
  const [busy,setBusy]=useState(false), [notice,setNotice]=useState(""), [error,setError]=useState(false);

  useEffect(()=>onAuthStateChanged(auth,u=>{
    if(!u){router.replace("/admin/login");return;}
    setUser(u); setName(u.displayName||"Admin"); setEmail(u.email||""); setChecking(false);
  }),[router]);

  const result=(t:string,e=false)=>{setNotice(t);setError(e);};

  const saveName=async()=>{
    if(!user||busy)return;
    if(!name.trim()){result("Enter an admin name.",true);return;}
    setBusy(true); result("");
    try{await updateProfile(user,{displayName:name.trim()}); await user.reload(); setUser(auth.currentUser); result("Admin name updated successfully.");}
    catch(e){result(messageFor(e),true);} finally{setBusy(false);}
  };

  const saveSecurity=async()=>{
    const u=auth.currentUser; if(!u||busy)return;
    const oldEmail=u.email||"", newEmail=email.trim().toLowerCase();
    const changeEmail=!!newEmail&&newEmail!==oldEmail.toLowerCase(), changePassword=!!next;
    if(!changeEmail&&!changePassword){result("Enter a new login email or new password.",true);return;}
    if(!current){result("Current password is required.",true);return;}
    if(changePassword&&next.length<6){result("New password must be at least 6 characters.",true);return;}
    if(changePassword&&next!==confirm){result("New passwords do not match.",true);return;}
    if(changePassword&&next===current){result("New password must be different.",true);return;}
    setBusy(true); result("");
    try{
      await reauthenticateWithCredential(u,EmailAuthProvider.credential(oldEmail,current));
      if(changeEmail) await updateEmail(u,newEmail);
      if(changePassword) await updatePassword(u,next);
      await u.reload(); setUser(auth.currentUser); setEmail(auth.currentUser?.email||newEmail);
      setCurrent(""); setNext(""); setConfirm("");
      result(changeEmail&&changePassword?"Login email and password updated successfully.":changeEmail?"Login email updated. Use it next time you sign in.":"Password updated successfully.");
    }catch(e){result(messageFor(e),true);} finally{setBusy(false);}
  };

  if(checking)return <SafeAreaView style={s.loading}><ActivityIndicator size="large" color={NAVY}/><Text style={s.muted}>Loading account settings...</Text></SafeAreaView>;
  if(!user)return null;

  return <SafeAreaView style={s.page} edges={["top","bottom"]}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.top}><TouchableOpacity style={s.back} onPress={()=>router.replace("/admin")}><Ionicons name="arrow-back" size={20} color={NAVY}/><Text style={s.backText}>Dashboard</Text></TouchableOpacity><View style={s.secure}><Ionicons name="shield-checkmark" size={17} color={GREEN}/><Text style={s.secureText}>Secure Account</Text></View></View>
    <View style={s.hero}><View style={s.avatar}><Text style={s.avatarText}>{(name||email||"A").charAt(0).toUpperCase()}</Text></View><View><Text style={s.title}>Admin Account Settings</Text><Text style={s.muted}>Manage admin name, login email and password.</Text></View></View>
    {notice?<View style={[s.notice,error?s.error:s.success]}><Ionicons name={error?"alert-circle":"checkmark-circle"} size={20} color={error?RED:GREEN}/><Text style={[s.noticeText,{color:error?RED:GREEN}]}>{notice}</Text></View>:null}
    <View style={s.grid}>
      <View style={s.card}><Heading icon="person-outline" title="Admin Profile" sub="Name shown inside the admin panel"/><Field label="Admin Name / Username" value={name} onChangeText={setName} icon="person-outline"/><TouchableOpacity style={s.primary} disabled={busy} onPress={()=>void saveName()}><Ionicons name="save-outline" size={18} color={WHITE}/><Text style={s.primaryText}>Save Admin Name</Text></TouchableOpacity></View>
      <View style={s.card}><Heading icon="key-outline" title="Login & Password" sub="Current password is required before changes"/><Field label="Login Email" value={email} onChangeText={setEmail} icon="mail-outline" email/><Password label="Current Password" value={current} setValue={setCurrent} show={showCurrent} toggle={()=>setShowCurrent(v=>!v)}/><Password label="New Password" value={next} setValue={setNext} show={showNext} toggle={()=>setShowNext(v=>!v)}/><Password label="Confirm New Password" value={confirm} setValue={setConfirm} show={showConfirm} toggle={()=>setShowConfirm(v=>!v)}/><TouchableOpacity style={s.securityBtn} disabled={busy} onPress={()=>void saveSecurity()}><Ionicons name="shield-checkmark-outline" size={19} color={DARK}/><Text style={s.securityBtnText}>{busy?"Updating...":"Update Login Security"}</Text></TouchableOpacity><Text style={s.note}>Passwords are handled securely by Firebase Authentication and are never stored in Firestore.</Text></View>
    </View>
  </ScrollView></SafeAreaView>;
}

function Heading({icon,title,sub}:{icon:keyof typeof Ionicons.glyphMap;title:string;sub:string}){return <View style={s.heading}><View style={s.iconBubble}><Ionicons name={icon} size={21} color={NAVY}/></View><View><Text style={s.cardTitle}>{title}</Text><Text style={s.cardSub}>{sub}</Text></View></View>}
function Field({label,value,onChangeText,icon,email=false}:{label:string;value:string;onChangeText:(v:string)=>void;icon:keyof typeof Ionicons.glyphMap;email?:boolean}){return <View><Text style={s.label}>{label}</Text><View style={s.inputWrap}><Ionicons name={icon} size={19} color={MUTED}/><TextInput value={value} onChangeText={onChangeText} keyboardType={email?"email-address":"default"} autoCapitalize={email?"none":"words"} autoCorrect={false} style={s.input}/></View></View>}
function Password({label,value,setValue,show,toggle}:{label:string;value:string;setValue:(v:string)=>void;show:boolean;toggle:()=>void}){return <View><Text style={s.label}>{label}</Text><View style={s.inputWrap}><Ionicons name="lock-closed-outline" size={19} color={MUTED}/><TextInput value={value} onChangeText={setValue} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} style={s.input}/><TouchableOpacity onPress={toggle}><Ionicons name={show?"eye-off-outline":"eye-outline"} size={20} color={MUTED}/></TouchableOpacity></View></View>}

const s=StyleSheet.create({page:{flex:1,backgroundColor:"#FFF9EE"},loading:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F6F8FC"},content:{flexGrow:1,padding:28,backgroundColor:"rgba(246,248,252,0.78)"},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:24},back:{minHeight:42,flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:14,borderRadius:12,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER},backText:{color:NAVY,fontWeight:"800",fontSize:13},secure:{minHeight:38,flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:13,borderRadius:20,backgroundColor:"#E7F8F1"},secureText:{color:GREEN,fontSize:12,fontWeight:"900"},hero:{flexDirection:"row",alignItems:"center",gap:16,marginBottom:24},avatar:{width:64,height:64,borderRadius:32,alignItems:"center",justifyContent:"center",backgroundColor:NAVY,borderWidth:3,borderColor:GOLD},avatarText:{color:WHITE,fontSize:25,fontWeight:"900"},title:{color:DARK,fontSize:28,fontWeight:"900",marginBottom:5},muted:{color:MUTED,fontSize:13},notice:{flexDirection:"row",alignItems:"center",gap:9,padding:14,borderRadius:12,marginBottom:18,borderWidth:1},success:{backgroundColor:"#ECFDF5",borderColor:"#A7F3D0"},error:{backgroundColor:"#FEF2F2",borderColor:"#FECACA"},noticeText:{flex:1,fontSize:12,fontWeight:"700"},grid:{flexDirection:"row",flexWrap:"wrap",gap:18,alignItems:"flex-start"},card:{flexGrow:1,flexBasis:430,minWidth:300,padding:22,borderRadius:18,backgroundColor:WHITE,borderWidth:1,borderColor:BORDER,shadowColor:"#0F172A",shadowOpacity:.06,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:2},heading:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:18},iconBubble:{width:44,height:44,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:"#EAF2FB"},cardTitle:{color:DARK,fontSize:17,fontWeight:"900"},cardSub:{marginTop:3,color:MUTED,fontSize:11},label:{marginTop:13,marginBottom:7,color:DARK,fontSize:12,fontWeight:"800"},inputWrap:{minHeight:52,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:BORDER,backgroundColor:"#F8FAFC"},input:{flex:1,paddingVertical:0,color:"#0F172A",fontSize:14},primary:{minHeight:50,marginTop:22,borderRadius:12,backgroundColor:NAVY,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},primaryText:{color:WHITE,fontSize:13,fontWeight:"900"},securityBtn:{minHeight:50,marginTop:22,borderRadius:12,backgroundColor:GOLD,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},securityBtnText:{color:DARK,fontSize:13,fontWeight:"900"},note:{marginTop:12,color:MUTED,fontSize:10,lineHeight:16,textAlign:"center"}});
