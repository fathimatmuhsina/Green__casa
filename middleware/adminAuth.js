
const isLogin=async(req,res,next)=>{
  try {
    
    if(req.session.user_id){

    }
    else{
      return res.redirect('/admin');
    }
    next();

  } catch (error) {
    console.log(error.messsage);
    
  }
}
const isLogout=async(req,res,next)=>{
  try {
    
    if(req.session.user_id){
      return res.redirect('/admin/home');
    }

    next();

  } catch (error) {
    console.log(error.messsage);
    
  }
}
const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  } else {
    return res.status(403).json({ message: 'Forbidden' });
  }
};

 

module.exports={
  isLogin,
  isLogout,
  isAdmin
  // checkUserStatus
}
