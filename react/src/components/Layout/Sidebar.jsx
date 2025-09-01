//因版面調整將nav改道header , 故整個sidebar不用
// // Sidebar.jsx
// import React, { useState, useEffect } from "react";
// import { NavLink } from "react-router-dom";
// import { FaTachometerAlt, FaBars } from "react-icons/fa";
// import { VscAccount } from "react-icons/vsc";
// import { TbTopologyStar } from "react-icons/tb";
// import { GoLog } from "react-icons/go";
// import { BsNodePlusFill } from "react-icons/bs";


// export default function Sidebar({ setCurrentPage }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
//   const [drawerOpen, setDrawerOpen] = useState(false);

//   useEffect(() => {
//     const handleResize = () => setIsMobile(window.innerWidth <= 640);
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const menuItems = (
//     <>
//       <NavLink
//         to="/dashboard"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: collapsed ? 0 : "10px",
//           padding: "10px",
//           color: "#fff",
//           textDecoration: "none",
//           justifyContent: collapsed ? "center" : "flex-start",
//         }}
//         onClick={() => {
//           setCurrentPage("Dashboard");
//           if (isMobile) setDrawerOpen(false);
//         }}
//         title="Dashboard"
//       >
//         <FaTachometerAlt />
//         {!collapsed && !isMobile && <span>Dashboard</span>}
//       </NavLink>

//       <NavLink
//         to="/network"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: collapsed ? 0 : "10px",
//           padding: "10px",
//           color: "#fff",
//           textDecoration: "none",
//           justifyContent: collapsed ? "center" : "flex-start",
//         }}
//         onClick={() => {
//           setCurrentPage("network");
//           if (isMobile) setDrawerOpen(false);
//         }}
//         title="network"
//       >
//         <TbTopologyStar  />
//         {!collapsed && !isMobile && <span>network</span>}
//       </NavLink>



//       <NavLink
//         to="/events"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: collapsed ? 0 : "10px",
//           padding: "10px",
//           color: "#fff",
//           textDecoration: "none",
//           justifyContent: collapsed ? "center" : "flex-start",
//         }}
//         onClick={() => {
//           setCurrentPage("events");
//           if (isMobile) setDrawerOpen(false);
//         }}
//         title="events"
//       >
//         <GoLog  />
//         {!collapsed && !isMobile && <span>Events</span>}
//       </NavLink>




//       <NavLink
//         to="/nodes"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: collapsed ? 0 : "10px",
//           padding: "10px",
//           color: "#fff",
//           textDecoration: "none",
//           justifyContent: collapsed ? "center" : "flex-start",
//         }}
//         onClick={() => {
//           setCurrentPage("nodes");
//           if (isMobile) setDrawerOpen(false);
//         }}
//         title="nodes"
//       >
//         <BsNodePlusFill  />
//         {!collapsed && !isMobile && <span>Nodes</span>}
//       </NavLink>

//     </>
//   );

//   if (isMobile) {
//     return (
//       <>
//         {/* Mobile Top Bar with hamburger */}
//         <div
//           style={{
//             background: "#34495e",
//             color: "#fff",
//             height: "60px",
//             display: "flex",
//             alignItems: "center",
//             padding: "0 10px",
//           }}
//         >
//           <FaBars style={{ cursor: "pointer" }} size={20} onClick={() => setDrawerOpen(true)} />
//         </div>

//         {drawerOpen && (
//           <div
//             style={{
//               position: "fixed",
//               top: 0,
//               left: 0,
//               width: "100%",
//               height: "100%",
//               backgroundColor: "rgba(0,0,0,0.4)",
//               zIndex: 1000,
//             }}
//             onClick={() => setDrawerOpen(false)}
//           />
//         )}

//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: drawerOpen ? 0 : "-200px",
//             width: "200px",
//             height: "100vh",
//             background: "#34495e",
//             color: "#fff",
//             transition: "left 0.3s ease",
//             zIndex: 1001,
//             paddingTop: "60px",
//           }}
//         >
//           {menuItems}
//         </div>
//       </>
//     );
//   }

//   // Desktop / Tablet
//   return (
//     <div
//       style={{
//         width: collapsed ? "60px" : "200px",
//         background: "#34495e",
//         color: "#fff",
//         height: "100vh",
//         display: "flex",
//         flexDirection: "column",
//         transition: "width 0.3s ease",
//       }}
//     >
//       {/* Top bar with hamburger */}
//       <div
//         style={{
//           height: "60px",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: collapsed ? "center" : "flex-end",
//           padding: "0 10px",
//           cursor: "pointer",
//         }}
//         onClick={() => setCollapsed((v) => !v)}
//       >
//         <div className="hamburger">
//           <FaBars />
//         </div>
//       </div>

//       {menuItems}
//     </div>
//   );
// }
